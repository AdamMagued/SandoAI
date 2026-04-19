import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, normalizeEvent } from "@/app/api/ticker/route";
import { getTickerBus, TickerBus } from "@/lib/ticker-bus";

function resetBus(): void {
  getTickerBus().reset();
}

afterEach(() => {
  resetBus();
  delete (globalThis as { __sandoTickerBus?: TickerBus }).__sandoTickerBus;
});

function asNextRequest(input: Request): NextRequest {
  // NextRequest extends Request; the route only uses .json()/.signal/.nextUrl,
  // none of which require Next-specific construction at runtime.
  return input as unknown as NextRequest;
}

describe("normalizeEvent", () => {
  it("fills defaults for missing fields", () => {
    const event = normalizeEvent({});
    expect(typeof event.id).toBe("string");
    expect(event.id.length).toBeGreaterThan(0);
    expect(typeof event.timestamp).toBe("string");
    expect(new Date(event.timestamp).toString()).not.toBe("Invalid Date");
    expect(event).toMatchObject({
      mood: "unknown",
      weather: "unknown",
      sandwich: "unknown",
      reasoning: "",
      confidence: 0,
    });
  });

  it("preserves valid fields and coerces invalid ones", () => {
    const event = normalizeEvent({
      id: "abc",
      timestamp: "2026-04-19T12:34:56.000Z",
      mood: "joyful",
      weather: "clear",
      sandwich: "BLT",
      reasoning: "because",
      confidence: 99.1,
    });
    expect(event).toEqual({
      id: "abc",
      timestamp: "2026-04-19T12:34:56.000Z",
      mood: "joyful",
      weather: "clear",
      sandwich: "BLT",
      reasoning: "because",
      confidence: 99.1,
    });
  });

  it("preserves geolocation when present and drops it when absent", () => {
    const withGeo = normalizeEvent({ geolocation: "Cairo" });
    expect(withGeo.geolocation).toBe("Cairo");
    const without = normalizeEvent({});
    expect(without.geolocation).toBeUndefined();
    const empty = normalizeEvent({ geolocation: "" });
    expect(empty.geolocation).toBeUndefined();
  });

  it("carries ingredients and timeOfDay through the pipeline", () => {
    const ev = normalizeEvent({
      ingredients: ["bacon", "egg", "cheddar", 42, ""],
      timeOfDay: "early_morning",
    });
    expect(ev.ingredients).toEqual(["bacon", "egg", "cheddar"]);
    expect(ev.timeOfDay).toBe("early_morning");

    const empty = normalizeEvent({ ingredients: [], timeOfDay: "" });
    expect(empty.ingredients).toBeUndefined();
    expect(empty.timeOfDay).toBeUndefined();
  });

  it("rejects non-string fields and NaN confidence", () => {
    const event = normalizeEvent({
      id: 123,
      mood: null,
      weather: undefined,
      sandwich: 42,
      reasoning: 7,
      confidence: Number.NaN,
    });
    expect(typeof event.id).toBe("string");
    expect(event.id).not.toBe("123");
    expect(event.mood).toBe("unknown");
    expect(event.weather).toBe("unknown");
    expect(event.sandwich).toBe("unknown");
    expect(event.reasoning).toBe("");
    expect(event.confidence).toBe(0);
  });
});

describe("POST /api/ticker", () => {
  it("publishes a normalized event to the bus and echoes it", async () => {
    const payload = {
      id: "uuid-1",
      timestamp: "2026-04-19T00:00:00.000Z",
      mood: "melancholic",
      weather: "thunderstorm",
      sandwich: "Grilled Cheese",
      reasoning: "warmth prevails",
      confidence: 97.3,
    };

    const request = new Request("http://localhost/api/ticker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(asNextRequest(request));
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      ok: boolean;
      event: typeof payload;
      subscribers: number;
    };
    expect(json.ok).toBe(true);
    expect(json.event).toEqual(payload);
    expect(getTickerBus().getHistory()).toHaveLength(1);
  });

  it("returns 400 on invalid JSON", async () => {
    const request = new Request("http://localhost/api/ticker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const response = await POST(asNextRequest(request));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid json/i);
    expect(getTickerBus().getHistory()).toHaveLength(0);
  });
});

describe("GET /api/ticker (SSE)", () => {
  async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const { value, done } = await reader.read();
    if (done || !value) return "";
    return new TextDecoder().decode(value);
  }

  it("emits an open frame, replays history, and streams new events", async () => {
    const bus = getTickerBus();
    bus.publish({
      id: "history-1",
      timestamp: "2026-04-18T00:00:00.000Z",
      mood: "calm",
      weather: "clear",
      sandwich: "Cucumber",
      reasoning: "steady",
      confidence: 95.5,
    });

    const controller = new AbortController();
    const request = new Request("http://localhost/api/ticker", {
      signal: controller.signal,
    });

    const response = await GET(asNextRequest(request));
    expect(response.headers.get("Content-Type")).toMatch(/text\/event-stream/);
    expect(response.headers.get("Cache-Control")).toMatch(/no-cache/);

    const reader = response.body!.getReader();

    const opening = await readChunk(reader);
    expect(opening).toMatch(/^: ticker connected/);

    const replay = await readChunk(reader);
    expect(replay).toMatch(/event: sandwich/);
    expect(replay).toContain("history-1");

    bus.publish({
      id: "live-1",
      timestamp: "2026-04-19T00:00:00.000Z",
      mood: "anxious",
      weather: "storm",
      sandwich: "Tuna Melt",
      reasoning: "for the storm",
      confidence: 98.2,
    });

    const live = await readChunk(reader);
    expect(live).toContain("live-1");
    expect(live).toContain("Tuna Melt");

    controller.abort();
    await reader.cancel().catch(() => {});
  });

  it("end-to-end: POST flows into an open SSE subscriber", async () => {
    const controller = new AbortController();
    const subRequest = new Request("http://localhost/api/ticker", {
      signal: controller.signal,
    });
    const subResponse = await GET(asNextRequest(subRequest));
    const reader = subResponse.body!.getReader();

    // Drain the open frame.
    await readChunk(reader);

    const post = await POST(
      asNextRequest(
        new Request("http://localhost/api/ticker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "wired",
            timestamp: "2026-04-19T01:00:00.000Z",
            mood: "joyful",
            weather: "sunny",
            sandwich: "Caprese",
            reasoning: "summer in your mouth",
            confidence: 96.4,
          }),
        })
      )
    );
    expect(post.status).toBe(200);

    const frame = await readChunk(reader);
    expect(frame).toContain("wired");
    expect(frame).toContain("Caprese");

    controller.abort();
    await reader.cancel().catch(() => {});
  });
});
