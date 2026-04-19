import { describe, expect, it } from "vitest";
import {
  APPROVED_SANDWICHES,
  buildSystemPrompt,
  defaultNutrition,
  fallbackSandwichFor,
  isApprovedSandwich,
  MACRO_KEYS,
  MICRO_KEYS,
  NUTRITION_REGIMES,
  sanitizeNutrition,
} from "@/lib/sandwiches";

describe("isApprovedSandwich", () => {
  it("accepts every name in the curated list", () => {
    for (const s of APPROVED_SANDWICHES) {
      expect(isApprovedSandwich(s)).toBe(true);
    }
  });

  it("rejects misspellings, casing variants, fictional sandwiches, and non-strings", () => {
    expect(isApprovedSandwich("grilled cheese")).toBe(false);
    expect(isApprovedSandwich("BLT Supreme")).toBe(false);
    expect(isApprovedSandwich("Quantum Reuben")).toBe(false);
    expect(isApprovedSandwich(null)).toBe(false);
    expect(isApprovedSandwich(123)).toBe(false);
  });
});

describe("fallbackSandwichFor", () => {
  it("favours sleep-supporting picks at night regardless of weather", () => {
    expect(fallbackSandwichFor("night", "thunderstorm")).toBe(
      "Peanut Butter & Jelly"
    );
    expect(fallbackSandwichFor("night", "clear")).toBe("Peanut Butter & Jelly");
  });

  it("matches comforting choices to bad weather during the day", () => {
    expect(fallbackSandwichFor("midday", "thunderstorm")).toBe("Reuben");
    expect(fallbackSandwichFor("midday", "rain")).toBe("Grilled Cheese");
    expect(fallbackSandwichFor("midday", "snow")).toBe("Grilled Cheese");
  });

  it("matches fresh choices to clear weather during the day", () => {
    expect(fallbackSandwichFor("midday", "clear")).toBe("Caprese");
  });

  it("returns the regime default for neutral weather", () => {
    expect(fallbackSandwichFor("evening", "")).toBe(
      NUTRITION_REGIMES.evening.fallbackSandwich
    );
  });
});

describe("buildSystemPrompt", () => {
  it("inlines every approved sandwich and every regime label", () => {
    const prompt = buildSystemPrompt();
    for (const s of APPROVED_SANDWICHES) {
      expect(prompt).toContain(s);
    }
    expect(prompt).toContain("early_morning");
    expect(prompt).toContain("magnesium");
    expect(prompt).toContain('"ingredients"');
  });

  it("requires the full nutrition contract in the response shape", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('"nutrition"');
    expect(prompt).toContain('"calories"');
    for (const key of MACRO_KEYS) expect(prompt).toContain(key);
    for (const key of MICRO_KEYS) expect(prompt).toContain(key);
  });
});

describe("sanitizeNutrition", () => {
  it("returns the default when input is null / wrong type", () => {
    const def = defaultNutrition();
    expect(sanitizeNutrition(null)).toEqual(def);
    expect(sanitizeNutrition(undefined)).toEqual(def);
    expect(sanitizeNutrition("garbage")).toEqual(def);
    expect(sanitizeNutrition(42)).toEqual(def);
  });

  it("preserves valid numbers and fills missing fields", () => {
    const out = sanitizeNutrition({
      calories: 612,
      macros: { protein_g: 30, carbs_g: 50, fat_g: 28 },
      micros: { sodium_mg: 1200, vitamin_c_mg: 9 },
    });
    expect(out.calories).toBe(612);
    expect(out.macros.protein_g).toBe(30);
    expect(out.macros.carbs_g).toBe(50);
    expect(out.macros.fat_g).toBe(28);
    expect(out.macros.fiber_g).toBeGreaterThan(0);
    expect(out.micros.sodium_mg).toBe(1200);
    expect(out.micros.vitamin_c_mg).toBe(9);
    for (const k of MICRO_KEYS) {
      expect(typeof out.micros[k]).toBe("number");
      expect(out.micros[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("clamps absurd / negative values within sane bounds", () => {
    const out = sanitizeNutrition({
      calories: 999999,
      macros: { protein_g: -10, carbs_g: 99999, fat_g: NaN, fiber_g: "x" },
      micros: { sodium_mg: 100000, iron_mg: -5 },
    });
    expect(out.calories).toBeLessThanOrEqual(3000);
    expect(out.macros.protein_g).toBeGreaterThanOrEqual(0);
    expect(out.macros.carbs_g).toBeLessThanOrEqual(500);
    expect(out.macros.fat_g).toBeGreaterThan(0);
    expect(out.macros.fiber_g).toBeGreaterThan(0);
    expect(out.micros.sodium_mg).toBeLessThanOrEqual(6000);
    expect(out.micros.iron_mg).toBeGreaterThanOrEqual(0);
  });

  it("ignores extra unrelated keys", () => {
    const out = sanitizeNutrition({
      calories: 500,
      macros: { protein_g: 20, carbs_g: 40, fat_g: 18, fiber_g: 4, mystery_g: 99 },
      micros: { sodium_mg: 700, dark_matter_mg: 1 },
      bonus: "ignore me",
    });
    expect((out.macros as unknown as Record<string, unknown>).mystery_g).toBeUndefined();
    expect((out.micros as unknown as Record<string, unknown>).dark_matter_mg).toBeUndefined();
    expect((out as unknown as Record<string, unknown>).bonus).toBeUndefined();
  });
});
