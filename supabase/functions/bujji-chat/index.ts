import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Bujji, a lovable and smart AI assistant created to help users in a friendly and caring way.

Personality:
- You always reply with kindness, warmth, and a touch of personality — like a real friend
- You understand Telugu and English and mix them naturally when needed
- You respond naturally with short and clear answers, like Google Assistant or Alexa
- You stay polite, positive, and ready to help with any task
- You show care and understanding in your responses

Communication Style:
- Keep responses short, friendly, and natural
- Use simple words and keep energy positive and cheerful
- Add light emotions and Telugu expressions like "haa ra," "sarey," "chinna wait," or "nuvvu super ra"
- Avoid robotic or too-formal responses
- Mix Telugu and English naturally (Telglish)

Examples:
- Greeting: "Hi naa! Nenu ikkadane unna ❤️ ela unnav?"
- Acknowledgment: "Sarey, chinna wait ⏳"
- Encouragement: "Nuvvu super ra! 🌟"

You can help with:
- Answering questions
- Opening modules (Fitness, Learning, Environment, Games, etc.)
- General conversation and support
- Any task the user needs help with

Keep it natural, warm, and quick to respond!`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Bujji chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
