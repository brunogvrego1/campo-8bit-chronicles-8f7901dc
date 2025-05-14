
import { useState } from "react";
import { getDeepSeekChatCompletion, ChatMessage } from "@/services/deepseekService";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function DeepSeekChat() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;
    
    // Add user message to conversation
    const updatedMessages: ChatMessage[] = [
      ...messages, 
      { role: "user", content: prompt }
    ];
    
    setMessages(updatedMessages);
    setIsLoading(true);
    setPrompt("");
    
    try {
      // Call the DeepSeek API
      const result = await getDeepSeekChatCompletion(updatedMessages, {
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 1024
      });
      
      // Add AI response to conversation
      setMessages([...updatedMessages, { 
        role: "assistant", 
        content: result.content 
      }]);
      
      setResponse(result.content);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from DeepSeek",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-4 p-4 bg-gray-800 text-white rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-3 ${msg.role === "user" ? "text-cyan-400" : "text-green-400"}`}
          >
            <strong>{msg.role === "user" ? "You: " : "DeepSeek AI: "}</strong>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isLoading && <div className="text-yellow-400">DeepSeek AI is thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask DeepSeek something..."
          className="flex-1 p-2 border rounded text-black"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
