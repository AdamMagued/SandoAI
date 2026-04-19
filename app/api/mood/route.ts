import { geminiVision } from "@/lib/gemini";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const result = await geminiVision.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
      {
        text: `Analyze the emotional state of the person in this image.
Return STRICT JSON only, no markdown, no explanation:
{
  "mood": "one word emotional state (e.g. melancholic, joyful, anxious, contemplative)",
  "description": "2-3 word evocative description of their emotional state"
}`,
      },
    ]);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return Response.json(parsed);
  } catch (error) {
    console.error("Mood detection error:", error);
    // Fallback — return a default mood so the flow continues
    return Response.json({
      mood: "contemplative",
      description: "lost in thought",
    });
  }
}
