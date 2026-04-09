import { geolocation, ipAddress } from "@vercel/functions";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  autoSelectModel,
  chatModelsMap,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { nvidia } from "@/lib/ai/providers";
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    // Resolve model: support 'auto' selection
    let resolvedModelId = selectedChatModel;

    if (!resolvedModelId || resolvedModelId === "auto" || !allowedModelIds.has(resolvedModelId)) {
      // Detect attachments for auto-selection
      const lastUserMessage = message;
      let hasImage = false;
      let hasAudio = false;
      let messageText = "";

      if (lastUserMessage?.parts) {
        for (const part of lastUserMessage.parts) {
          if (part.type === "text") {
            messageText += part.text;
          }
          if (part.type === "file") {
            const mt = (part as any).mediaType || "";
            if (mt.startsWith("image/")) {
              hasImage = true;
            }
            if (mt.startsWith("audio/")) {
              hasAudio = true;
            }
          }
        }
      }

      resolvedModelId = autoSelectModel(hasImage, hasAudio, messageText);
    }

    const chatModel = resolvedModelId;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part: any) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const modelConfig = chatModelsMap.get(chatModel);
    const capabilities = getCapabilities();
    const modelCaps = capabilities[chatModel];
    const supportsTools = modelCaps?.tools === true;

    // Build conversation messages for NVIDIA NIM
    const sysPrompt = systemPrompt({ requestHints, supportsTools });

    // Convert UI messages to simple format for NVIDIA NIM
    const nimMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: sysPrompt },
    ];

    for (const msg of uiMessages) {
      const textParts = msg.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      if (textParts) {
        nimMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: textParts,
        });
      }
    }

    // Create the NVIDIA NIM streaming response
    const encoder = new TextEncoder();

    const nimStream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        let fullReasoning = "";
        let textStarted = false;
        let reasoningStarted = false;
        const textId = generateUUID();
        const reasoningId = generateUUID();
        
        try {
          const requestParams: any = {
            model: modelConfig?.nimModelId ?? "moonshotai/kimi-k2-instruct",
            messages: nimMessages,
            temperature: modelConfig?.temperature ?? 0.6,
            top_p: modelConfig?.topP ?? 0.9,
            max_tokens: modelConfig?.maxTokens ?? 4096,
            stream: true,
          };

          // DeepSeek thinking mode
          if (modelConfig?.thinking) {
            requestParams.chat_template_kwargs = { thinking: true };
          }

          const completion = await nvidia.chat.completions.create(requestParams) as any;
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "start-step" })}\n\n`)
          );

          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) {
              continue;
            }

            // Handle reasoning content (DeepSeek thinking)
            const reasoningContent = (delta as any).reasoning_content;
            if (reasoningContent) {
              fullReasoning += reasoningContent;
              if (!reasoningStarted) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "reasoning-start", id: reasoningId })}\n\n`)
                );
                reasoningStarted = true;
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "reasoning-delta", id: reasoningId, delta: reasoningContent })}\n\n`)
              );
            }

            // Handle regular content
            if (delta.content) {
              fullText += delta.content;
              if (!textStarted) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "text-start", id: textId })}\n\n`)
                );
                textStarted = true;
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text-delta", id: textId, delta: delta.content })}\n\n`)
              );
            }

            if (chunk.choices?.[0]?.finish_reason) {
              break;
            }
          }

          if (reasoningStarted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "reasoning-end", id: reasoningId })}\n\n`)
            );
          }
          if (textStarted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text-end", id: textId })}\n\n`)
            );
          }
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "finish-step" })}\n\n`)
          );

          // Generate title if needed
          if (titlePromise) {
            const title = await titlePromise;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "data-chat-title", data: title })}\n\n`)
            );
            updateChatTitleById({ chatId: id, title });
          }

          // Save assistant message
          const assistantParts: any[] = [];
          if (fullReasoning) {
            assistantParts.push({ type: "reasoning", text: fullReasoning });
          }
          if (fullText) {
            assistantParts.push({ type: "text", text: fullText });
          }

          if (assistantParts.length > 0) {
            await saveMessages({
              messages: [
                {
                  id: generateUUID(),
                  role: "assistant",
                  parts: assistantParts,
                  createdAt: new Date(),
                  attachments: [],
                  chatId: id,
                },
              ],
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("NVIDIA NIM streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: "Sorry, an error occurred while generating the response." })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(nimStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
