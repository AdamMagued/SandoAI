import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isMongoConfigured,
  loadRecentEvents,
  persistEvent,
} from "@/lib/mongo";

const ORIGINAL_URI = process.env.MONGODB_URI;

beforeEach(() => {
  delete process.env.MONGODB_URI;
  (globalThis as { __sandoMongoClient?: unknown }).__sandoMongoClient = undefined;
});

afterEach(() => {
  if (ORIGINAL_URI === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = ORIGINAL_URI;
  }
});

describe("Mongo adapter (no-op mode)", () => {
  it("isMongoConfigured returns false without MONGODB_URI", () => {
    expect(isMongoConfigured()).toBe(false);
  });

  it("persistEvent resolves to false without configuration", async () => {
    const ok = await persistEvent({
      id: "x",
      timestamp: new Date().toISOString(),
      mood: "calm",
      weather: "clear",
      sandwich: "BLT",
      reasoning: "no clouds",
      confidence: 95,
    });
    expect(ok).toBe(false);
  });

  it("loadRecentEvents returns an empty array without configuration", async () => {
    const events = await loadRecentEvents();
    expect(events).toEqual([]);
  });

  it("isMongoConfigured returns true once MONGODB_URI is set", () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    expect(isMongoConfigured()).toBe(true);
  });
});
