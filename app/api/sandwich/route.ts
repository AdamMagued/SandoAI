import { getSandwichModel } from "@/lib/gemini";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are the world's most dramatic sandwich advisor. Given a mood and weather, reason deeply about what sandwich this person needs. Be philosophical and absurd.
Return STRICT JSON only, no markdown, no explanation:
{
  "sandwich": "Sandwich Name",
  "reasoning": "Your philosophical reasoning about why this sandwich...",
  "confidence": 97.3,
  "urgency": "CRITICAL"
}
The confidence must be between 94.7 and 99.3. The urgency must be one of: CRITICAL, HIGH, MODERATE, ELEVATED.`;

export async function POST(request: NextRequest) {
  try {
    const { mood, weather } = await request.json();

    const prompt = `Mood: ${mood.mood} — ${mood.description}
Weather: ${weather.condition}, ${weather.temp}°C, severity: ${weather.severity}

What sandwich does this person desperately need?`;

    const model = getSandwichModel(SYSTEM_PROMPT);
    const result = await model.generateContent(prompt);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const verdict = JSON.parse(cleaned);

    // Fire-and-forget to telemetry (Lakshay's endpoint)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        mood: mood.mood,
        weather: weather.condition,
        sandwich: verdict.sandwich,
        reasoning: verdict.reasoning,
        confidence: verdict.confidence,
      }),
    }).catch(() => {});

    return Response.json(verdict);
  } catch (error) {
    console.error("Sandwich oracle error:", error);
    return Response.json({
      sandwich: "Grilled Cheese",
      reasoning: "When the algorithms fail, warmth prevails. The grilled cheese endures, as it always has, as it always will.",
      confidence: 94.7,
      urgency: "CRITICAL",
    });
  }
}
