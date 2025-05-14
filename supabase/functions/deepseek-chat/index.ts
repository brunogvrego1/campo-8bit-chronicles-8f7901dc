
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

    console.log(`Processing request for model ${chatModel}`);

    // Make the API call to DeepSeek
    const response = await client.chat.completions.create({
      model: chatModel,
      messages: messages,
      temperature: chatTemp,
      max_tokens: chatMaxTokens,
      stream: shouldStream
    });

    // Return the response
    return new Response(JSON.stringify({
      content: response.choices[0].message.content,
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
