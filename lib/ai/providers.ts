import OpenAI from "openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

// NVIDIA NIM OpenAI-compatible client - lazy loaded
let _nvidia: OpenAI | null = null;

export function getNvidiaClient(): OpenAI {
  if (!_nvidia) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is not set");
    }
    _nvidia = new OpenAI({
      apiKey,
      baseURL: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    });
  }
  return _nvidia;
}

// For backward compatibility
export const nvidia = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getNvidiaClient()[prop as keyof OpenAI];
  }
});

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }
  // For non-test, we use the nvidia client directly in the route
  // This function is kept for compatibility with title generation
  return null as any;
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return null as any;
}
