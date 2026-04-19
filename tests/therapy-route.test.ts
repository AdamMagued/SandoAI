import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function asNextRequest(input: Request): NextRequest {
  return input as unknown as NextRequest;
}

const generateContent = vi.fn();

vi.mock("@/lib/gemini", () => ({
  getSandwichModel: () => ({
    generateContent: (...args: unknown[]) => generateContent(...args),
  }),
}));

afterEach(() => {
  generateContent.mockReset();
});

async function importRoute() {
  return await import("@/app/api/therapy/route");
}

describe("POST /api/therapy", () => {
  it("returns the therapist reply and no newVerdict on the opening turn", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            reply: "I hear you. What's bothering you about that pick?",
            newVerdict: null,
            resolved: false,
          }),
      },
    });

    const { POST } = await importRoute();
    const res = await POST(
      asNextRequest(
        new Request("http://localhost/api/therapy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verdict: { sandwich: "BLT" },
            context: { mood: "anxious", weather: "rain", timeOfDay: "midday" },
            history: [],
            message: "",
          }),
        })
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reply: string;
      newVerdict: unknown;
      resolved: boolean;
    };
    expect(body.reply).toMatch(/hear you/i);
    expect(body.newVerdict).toBeNull();
    expect(body.resolved).toBe(false);
  });

  it("snaps invalid sandwich names in newVerdict to an approved one", async () => {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            reply: "Try this instead.",
            newVerdict: {
              sandwich: "Quantum Reuben",
              reasoning: "you'll see",
              ingredients: ["pastrami", "swiss"],
            },
            resolved: true,
          }),
      },
    });

    const { POST } = await importRoute();
    const res = await POST(
      asNextRequest(
        new Request("http://localhost/api/therapy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verdict: { sandwich: "BLT" },
            context: { mood: "anxious", weather: "rain", timeOfDay: "evening" },
            history: [{ role: "user", text: "I want something hearty" }],
            message: "yes please",
          }),
        })
      )
    );
    const body = (await res.json()) as {
      reply: string;
      newVerdict: { sandwich: string; ingredients: string[]; confidence: number };
      resolved: boolean;
    };
    expect(body.newVerdict).toBeTruthy();
    expect(body.newVerdict.sandwich).not.toBe("Quantum Reuben");
    expect(body.newVerdict.confidence).toBeGreaterThan(94);
    expect(body.newVerdict.confidence).toBeLessThan(100);
    expect(body.resolved).toBe(true);
  });

  it("returns a graceful fallback if Gemini throws", async () => {
    generateContent.mockRejectedValueOnce(new Error("rate limited"));
    const { POST } = await importRoute();
    const res = await POST(
      asNextRequest(
        new Request("http://localhost/api/therapy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verdict: { sandwich: "BLT" },
            context: { timeOfDay: "midday" },
            history: [],
            message: "I want something else",
          }),
        })
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string; newVerdict: unknown; resolved: boolean };
    expect(body.reply.length).toBeGreaterThan(0);
    expect(body.newVerdict).toBeNull();
    expect(body.resolved).toBe(false);
  });

  it("rejects malformed JSON bodies with a 400", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      asNextRequest(
        new Request("http://localhost/api/therapy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-json",
        })
      )
    );
    expect(res.status).toBe(400);
  });
});
