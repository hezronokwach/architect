
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, TOOLS } from "../constants";

let chatSession: Chat | null = null;

/**
 * Utility function to handle retries with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error?.message?.includes('503') ||
        error?.message?.includes('overloaded') ||
        error?.message?.includes('429') ||
        error?.message?.includes('Resource has been exhausted');

      if (isRetryable && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const initializeGeminiChat = (): Chat => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';


  const ai = new GoogleGenAI({ apiKey });

  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.5,
      tools: TOOLS,
    },
  });

  return chatSession;
};

export const sendMessageToGemini = async (
  message: string,
  currentContext: string
): Promise<GenerateContentResponse> => {
  if (!chatSession) {
    initializeGeminiChat();
  }

  const fullMessage = `[CURRENT DIAGRAM STATE: ${currentContext}] \n\n User Request: ${message}`;

  return await withRetry(() => chatSession!.sendMessage({ message: fullMessage }));
};

export const sendToolResponseToGemini = async (
  toolName: string,
  toolCallId: string,
  status: string
): Promise<GenerateContentResponse> => {
  if (!chatSession) {
    initializeGeminiChat();
  }

  const feedbackMessage = `The user has ${status} your proposal for "${toolName}" (ID: ${toolCallId}). Please continue the design based on this decision.`;

  return await withRetry(() => chatSession!.sendMessage({ message: feedbackMessage }));
};
