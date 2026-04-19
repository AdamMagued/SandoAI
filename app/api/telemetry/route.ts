import { insertEvent, SandwichEvent } from "@/lib/snowflake";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const event: SandwichEvent = {
      id: body.id ?? crypto.randomUUID(),
      timestamp: body.timestamp ?? new Date().toISOString(),
      mood: body.mood ?? "unknown",
      weather: body.weather ?? "unknown",
      sandwich: body.sandwich ?? "unknown",
      reasoning: body.reasoning ?? "",
      confidence: body.confidence ?? 0,
    };

    // Insert to Snowflake
    await insertEvent(event);

    // Forward to Mo's ticker (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/ticker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telemetry error:", error);
    // Return ok so the main flow isn't blocked
    return Response.json({ ok: false, error: "Telemetry pipeline temporarily offline" });
  }
}
