
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
    model: 'gemini-2.5-flash',
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
  currentContext: string,
  activeProposal?: any
): Promise<GenerateContentResponse> => {
  if (!chatSession) {
    initializeGeminiChat();
  }

  let fullMessage = `[CURRENT DIAGRAM STATE: ${currentContext}] \n\n User Request: ${message}`;

  if (activeProposal) {
    fullMessage += `\n\n[IMPORTANT: PENDING PROPOSAL DETECTED]\nThere is currently a pending proposal matching this structure: ${JSON.stringify(activeProposal)}. The user has NOT confirmed it yet and is asking a question or making a comment.\n\nYOU MUST:\n1. Answer the user's question or address their comment naturally.\n2. IMMEDIATELY AFTER your text response, YOU MUST CALL THE TOOL '${activeProposal.type === 'node' ? 'propose_node' : 'propose_connection'}' AGAIN using the EXACT SAME ARGUMENTS as the pending proposal.\n\nThis ensures the proposal remains visible to the user. DO NOT forget to call the tool again context will be lost.`;
  }

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
