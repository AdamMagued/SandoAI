import { synthesizeSpeech } from "@/lib/elevenlabs";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Voice synthesis error:", error);
    // Signal client to use browser TTS fallback
    return Response.json({ fallback: true, error: "ElevenLabs unavailable" }, { status: 503 });
  }
}
