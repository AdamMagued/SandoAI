import { insertEvent, SandwichEvent } from "@/lib/snowflake";
import { persistEvent } from "@/lib/mongo";
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
      geolocation: typeof body.geolocation === "string" ? body.geolocation : undefined,
      ingredients: Array.isArray(body.ingredients)
        ? body.ingredients.filter((v: unknown): v is string => typeof v === "string").slice(0, 6)
        : undefined,
      timeOfDay: typeof body.timeOfDay === "string" ? body.timeOfDay : undefined,
    };

    // Fan-out to the live ticker (fire-and-forget, runs regardless of warehouse status).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/ticker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});

    // Dual-write: Snowflake (warehouse / Cortex) + MongoDB (live feed history).
    const results = await Promise.allSettled([
      insertEvent(event),
      persistEvent(event),
    ]);

    const snowflakeOk = results[0].status === "fulfilled";
    const mongoOk = results[1].status === "fulfilled" && results[1].value === true;

    return Response.json({ ok: true, snowflake: snowflakeOk, mongo: mongoOk });
  } catch (error) {
    console.error("Telemetry error:", error);
    // Return ok-shaped response so the caller's main flow isn't blocked.
    return Response.json({ ok: false, error: "Telemetry pipeline temporarily offline" });
  }
}
