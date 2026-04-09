export const DEFAULT_CHAT_MODEL = "kimi-k2";

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  nimModelId: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  supportsVision: boolean;
  supportsAudio: boolean;
  thinking?: boolean;
};

export const chatModels: ChatModel[] = [
  {
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "moonshotai",
    description: "Fast general-purpose chat model",
    nimModelId: "moonshotai/kimi-k2-instruct",
    temperature: 0.6,
    topP: 0.9,
    maxTokens: 4096,
    supportsVision: false,
    supportsAudio: false,
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "deepseek",
    description: "Advanced reasoning model with thinking",
    nimModelId: "deepseek-ai/deepseek-v3.2",
    temperature: 1,
    topP: 0.95,
    maxTokens: 8192,
    supportsVision: false,
    supportsAudio: false,
    thinking: true,
  },
  {
    id: "qwen-coder",
    name: "Qwen Coder",
    provider: "qwen",
    description: "Specialized coding assistant",
    nimModelId: "qwen/qwen3-coder-480b-a35b-instruct",
    temperature: 0.7,
    topP: 0.8,
    maxTokens: 4096,
    supportsVision: false,
    supportsAudio: false,
  },
  {
    id: "phi-4-multimodal",
    name: "Phi-4 Multimodal",
    provider: "microsoft",
    description: "Multimodal model for images and audio",
    nimModelId: "microsoft/phi-4-multimodal-instruct",
    temperature: 0.1,
    topP: 0.7,
    maxTokens: 512,
    supportsVision: true,
    supportsAudio: true,
  },
];

export const chatModelsMap = new Map(chatModels.map((m) => [m.id, m]));

export const titleModel = chatModels[0]; // Use Kimi K2 for titles

const CODING_KEYWORDS = [
  "code", "debug", "function", "bug", "implement", "typescript",
  "javascript", "python", "java", "rust", "golang", "html", "css",
  "react", "component", "api", "class", "method", "variable",
  "compile", "error", "fix", "refactor", "algorithm", "script",
  "program", "syntax", "loop", "array", "object", "regex",
];

const REASONING_KEYWORDS = [
  "analyze", "explain why", "compare", "step by step", "calculate",
  "reason", "think", "evaluate", "assess", "derive", "prove",
  "logic", "argument", "hypothesis", "conclusion", "because",
  "therefore", "mathematical", "solve", "proof", "deduce",
];

export function autoSelectModel(
  hasImage: boolean,
  hasAudio: boolean,
  messageText: string
): string {
  if (hasImage || hasAudio) return "phi-4-multimodal";

  const lower = messageText.toLowerCase();

  if (CODING_KEYWORDS.some((kw) => lower.includes(kw))) return "qwen-coder";
  if (REASONING_KEYWORDS.some((kw) => lower.includes(kw))) return "deepseek-v3";

  return "kimi-k2";
}

export function getCapabilities(): Record<string, ModelCapabilities> {
  return Object.fromEntries(
    chatModels.map((m) => [
      m.id,
      {
        tools: !m.supportsVision, // text-only models support tools
        vision: m.supportsVision,
        reasoning: m.thinking ?? false,
      },
    ])
  );
}

export const isDemo = false;

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set([
  "auto",
  ...chatModels.map((m) => m.id),
]);

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
