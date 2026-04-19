import { afterEach, describe, expect, it, vi } from "vitest";
import { TickerBus, getTickerBus } from "@/lib/ticker-bus";
import type { SandwichEvent } from "@/lib/snowflake";

function makeEvent(overrides: Partial<SandwichEvent> = {}): SandwichEvent {
  return {
    id: overrides.id ?? "evt-1",
    timestamp: overrides.timestamp ?? "2026-04-19T00:00:00.000Z",
    mood: overrides.mood ?? "melancholic",
    weather: overrides.weather ?? "thunderstorm",
    sandwich: overrides.sandwich ?? "Grilled Cheese",
    reasoning: overrides.reasoning ?? "warmth prevails",
    confidence: overrides.confidence ?? 97.3,
  };
}

afterEach(() => {
  // Clean global singleton between tests so they don't leak state.
  (globalThis as { __sandoTickerBus?: TickerBus }).__sandoTickerBus?.reset();
  delete (globalThis as { __sandoTickerBus?: TickerBus }).__sandoTickerBus;
});

describe("TickerBus", () => {
  it("delivers published events to all subscribers", () => {
    const bus = new TickerBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);

    const event = makeEvent();
    bus.publish(event);

    expect(a).toHaveBeenCalledExactlyOnceWith(event);
    expect(b).toHaveBeenCalledExactlyOnceWith(event);
  });

  it("unsubscribe stops delivery", () => {
    const bus = new TickerBus();
    const fn = vi.fn();
    const unsub = bus.subscribe(fn);

    bus.publish(makeEvent({ id: "1" }));
    unsub();
    bus.publish(makeEvent({ id: "2" }));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retains a bounded history buffer", () => {
    const bus = new TickerBus(3);
    for (let i = 0; i < 5; i++) {
      bus.publish(makeEvent({ id: `e${i}` }));
    }
    const history = bus.getHistory();
    expect(history).toHaveLength(3);
    expect(history.map((e) => e.id)).toEqual(["e2", "e3", "e4"]);
  });

  it("history is a defensive copy", () => {
    const bus = new TickerBus();
    bus.publish(makeEvent({ id: "x" }));
    const snapshot = bus.getHistory();
    snapshot.push(makeEvent({ id: "y" }));
    expect(bus.getHistory()).toHaveLength(1);
  });

  it("isolates a thrown subscriber from siblings", () => {
    const bus = new TickerBus();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    bus.subscribe(bad);
    bus.subscribe(good);

    bus.publish(makeEvent());

    expect(bad).toHaveBeenCalledOnce();
    expect(good).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("subscriberCount reflects active subscribers", () => {
    const bus = new TickerBus();
    expect(bus.subscriberCount()).toBe(0);
    const off1 = bus.subscribe(() => {});
    const off2 = bus.subscribe(() => {});
    expect(bus.subscriberCount()).toBe(2);
    off1();
    expect(bus.subscriberCount()).toBe(1);
    off2();
    expect(bus.subscriberCount()).toBe(0);
  });

  it("getTickerBus returns the same instance across calls", () => {
    const a = getTickerBus();
    const b = getTickerBus();
    expect(a).toBe(b);
  });

  it("seed populates history without notifying subscribers", () => {
    const bus = new TickerBus();
    const sub = vi.fn();
    bus.subscribe(sub);

    bus.seed([
      makeEvent({ id: "s1" }),
      makeEvent({ id: "s2" }),
      makeEvent({ id: "s3" }),
    ]);

    expect(sub).not.toHaveBeenCalled();
    expect(bus.getHistory().map((e) => e.id)).toEqual(["s1", "s2", "s3"]);
  });
});
