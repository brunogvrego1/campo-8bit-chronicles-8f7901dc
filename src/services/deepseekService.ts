
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for chat message
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Interface for chat completion options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Call the DeepSeek edge function with the provided messages
 */
export const getDeepSeekChatCompletion = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) => {
  try {
    const { data, error } = await supabase.functions.invoke("deepseek-chat", {
      body: {
        messages,
        ...options,
      },
    });

    if (error) {
      console.error("DeepSeek API error:", error);
      throw new Error(`DeepSeek API error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error calling DeepSeek service:", error);
    throw error;
  }
};
