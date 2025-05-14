
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://esm.sh/openai@4.28.0";

// Set up CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create the OpenAI client with DeepSeek base URL
const client = new OpenAI({
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
  baseURL: "https://api.deepseek.com",
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model, temperature, max_tokens, stream } = await req.json();

    // Set defaults if not provided
    const chatModel = model || "deepseek-chat";
    const chatTemp = temperature !== undefined ? temperature : 0.7;
    const chatMaxTokens = max_tokens || 1024;
    const shouldStream = stream !== undefined ? stream : false;

    console.log(`Processing request for model ${chatModel} with temperature ${chatTemp}`);

    // Extract the prompt to check for formatting issues
    const userPrompt = messages.find(m => m.role === "user")?.content || "";
    const isJsonRequested = userPrompt.toLowerCase().includes("json");

    // Make the API call to DeepSeek
    const response = await client.chat.completions.create({
      model: chatModel,
      messages: messages,
      temperature: chatTemp,
      max_tokens: chatMaxTokens,
      stream: shouldStream
    });

    // Process the content to ensure proper JSON formatting
    let processedContent = response.choices[0].message.content || "";
    
    // Fix common JSON formatting issues
    if (isJsonRequested) {
      // Strip code block markers if present
      processedContent = processedContent.replace(/```json\n/g, '').replace(/```\n?/g, '');
      
      // Check if it's valid JSON
      try {
        JSON.parse(processedContent);
      } catch (e) {
        console.error("Invalid JSON in response:", e.message);
        console.log("Attempting to fix JSON format...");
        
        // Try to extract JSON using regex
        const jsonMatch = processedContent.match(/{[\s\S]*}/);
        if (jsonMatch) {
          processedContent = jsonMatch[0];
          try {
            // Verify the extracted JSON is valid
            JSON.parse(processedContent);
          } catch (e2) {
            console.error("Failed to extract valid JSON:", e2.message);
          }
        }
      }
    }

    // Return the response with processed content
    return new Response(JSON.stringify({
      content: processedContent,
      role: response.choices[0].message.role,
      model: response.model,
      id: response.id,
      usage: response.usage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing DeepSeek request:", error.message);
    
    return new Response(JSON.stringify({
      error: error.message || "An error occurred while processing the request",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
