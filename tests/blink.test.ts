import { describe, expect, it } from "vitest";
import {
  buildActionUrl,
  buildBlinkUrl,
} from "@/components/ImmortalizeButton";

describe("Blink URL helpers", () => {
  const verdict = {
    sandwich: "Tuna Melt",
    reasoning: "for the storm",
    confidence: 98.2,
    urgency: "CRITICAL",
  };
  const context = { mood: "anxious", weather: "thunderstorm" };

  it("buildActionUrl encodes verdict + context as query parameters", () => {
    const url = new URL(buildActionUrl("https://sando.example", verdict, context));
    expect(url.origin).toBe("https://sando.example");
    expect(url.pathname).toBe("/api/actions/mint-sandwich");
    expect(url.searchParams.get("sandwich")).toBe("Tuna Melt");
    expect(url.searchParams.get("reasoning")).toBe("for the storm");
    expect(url.searchParams.get("confidence")).toBe("98.2");
    expect(url.searchParams.get("mood")).toBe("anxious");
    expect(url.searchParams.get("weather")).toBe("thunderstorm");
  });

  it("buildBlinkUrl wraps an action URL into a dial.to Blink", () => {
    const action = "https://sando.example/api/actions/mint-sandwich?sandwich=BLT";
    const blink = buildBlinkUrl(action);
    expect(blink.startsWith("https://dial.to/?action=solana-action:")).toBe(true);
    const encoded = blink.replace("https://dial.to/?action=solana-action:", "");
    expect(decodeURIComponent(encoded)).toBe(action);
  });
});
