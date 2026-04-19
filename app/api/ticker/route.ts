import { NextRequest } from "next/server";
import type { SandwichEvent } from "@/lib/snowflake";
import { getTickerBus } from "@/lib/ticker-bus";
import { isMongoConfigured, loadRecentEvents } from "@/lib/mongo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeEvent(body: unknown): SandwichEvent {
  const raw = (body ?? {}) as Record<string, unknown>;
  const event: SandwichEvent = {
    id: pickString(raw.id, crypto.randomUUID()),
    timestamp: pickString(raw.timestamp, new Date().toISOString()),
    mood: pickString(raw.mood, "unknown"),
    weather: pickString(raw.weather, "unknown"),
    sandwich: pickString(raw.sandwich, "unknown"),
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
    confidence: pickNumber(raw.confidence, 0),
  };
  if (typeof raw.geolocation === "string" && raw.geolocation.length > 0) {
    event.geolocation = raw.geolocation;
  }
  if (Array.isArray(raw.ingredients)) {
    const cleaned = raw.ingredients.filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    if (cleaned.length > 0) event.ingredients = cleaned.slice(0, 6);
  }
  if (typeof raw.timeOfDay === "string" && raw.timeOfDay.length > 0) {
    event.timeOfDay = raw.timeOfDay;
  }
  return event;
}

function sseFrame(event: SandwichEvent): string {
  return `event: sandwich\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const event = normalizeEvent(body);
  const bus = getTickerBus();
  bus.publish(event);

  return Response.json({
    ok: true,
    event,
    subscribers: bus.subscriberCount(),
  });
}

export async function GET(request: NextRequest) {
  const bus = getTickerBus();

  // Hydrate the in-memory bus from MongoDB on cold-start so a fresh client
  // immediately sees recent verdicts even after a server restart.
  if (bus.getHistory().length === 0 && isMongoConfigured()) {
    try {
      const recent = await loadRecentEvents(25);
      bus.seed(recent);
    } catch {
      // Non-fatal — proceed with whatever is in memory.
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      send(`: ticker connected ${Date.now()}\n\n`);

      // Replay recent history so a fresh client immediately sees activity.
      for (const event of bus.getHistory()) {
        send(sseFrame(event));
      }

      const unsubscribe = bus.subscribe((event) => {
        send(sseFrame(event));
      });

      // Heartbeat keeps intermediaries from closing the connection.
      const heartbeat = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      if (request.signal.aborted) {
        cleanup();
        return;
      }
      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
