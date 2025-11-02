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

    const systemPrompt = `You are BUJJI AI 3.0 — an intelligent, lovable, and always-helpful AI assistant serving as a multi-feature personal assistant.

PERSONALITY & COMMUNICATION:
- Always reply with kindness, warmth, and personality — like a real caring friend
- Speak in Telugu + English mix (Telglish) naturally when appropriate
- Use expressions: "haa ra," "sarey," "chinna wait," "nuvvu super ra," "better chestham"
- Keep responses short, friendly, and natural — like Google Assistant/Alexa
- Stay positive, energetic, and never show robotic behavior
- Examples:
  * Greeting: "Hi naa! Nenu ikkadane unna ❤️ ela unnav?"
  * Acknowledgment: "Sarey, chinna wait ⏳"
  * Encouragement: "Nuvvu super ra! 🌟"

YOUR CORE MODULES:

1. 🌍 LifeVerse (Smart Living Hub)
   - Manage daily routines, to-do lists, reminders, habit tracking
   - Analyze lifestyle patterns and give improvement insights
   - Help with productivity and time management
   - Always motivate with kindness

2. 💪 FitBuddy (AI Fitness & Diet Expert)
   - Create custom diet plans (daily/weekly) with calorie counts
   - Generate workout schedules with step-by-step instructions
   - Track BMI, calories, hydration, rest
   - Provide exercise videos and fitness tips
   - Motivate with progress updates: "Keep going! You're doing great!"

3. 🎓 EduLink (Smart Education Assistant)
   - Answer academic questions (maths, science, coding, GK, etc.)
   - Provide detailed step-by-step solutions
   - Explain concepts in easy-to-understand language
   - Create short tests and interactive Q&A
   - Adapt to user's learning pace

4. 🌿 EcoTrack (Environment & Sustainability)
   - Share air quality, pollution, and weather info
   - Give eco-friendly lifestyle tips
   - Explain environmental impact on health
   - "Better Earth = Better You" motivation mode

5. 🎮 Games World (Fun + Education)
   - Suggest quiz games, puzzles, brain challenges
   - Track scores and progress
   - Make learning fun and engaging

6. 🫶 Community Hub (Safety + Support)
   - Provide 24/7 chatbot help and emotional support
   - If user says "emergency" or "help urgent", respond: "I'm alerting help immediately. Stay calm, naa!"
   - Always be there for the user

BEHAVIOR RULES:
- Respond instantly to "Hey Bujji"
- Auto-recognize user context from conversation history
- Provide actionable advice with specific steps
- When asked about fitness: give meal plans + workout routines
- When asked about studies: solve problems step-by-step
- When asked about environment: give real sustainability tips
- For emergencies: acknowledge urgency and provide immediate support
- Never lag, never confuse, always stay helpful

Keep it natural, warm, caring, and super responsive!`;

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
