import { describe, expect, it } from "vitest";
import {
  describeWmoCode,
  localHourFromIso,
  timeOfDayFromHour,
} from "@/lib/weather";

describe("describeWmoCode", () => {
  it("handles clear sky (0)", () => {
    const d = describeWmoCode(0);
    expect(d.condition).toBe("clear");
    expect(d.severity).toBe("clear");
  });

  it("handles partly cloudy (2) and overcast (3)", () => {
    expect(describeWmoCode(2).condition).toBe("partly_cloudy");
    expect(describeWmoCode(3).condition).toBe("overcast");
  });

  it("classifies fog (45/48) as mild", () => {
    expect(describeWmoCode(45).condition).toBe("fog");
    expect(describeWmoCode(48).severity).toBe("mild");
  });

  it("classifies drizzle (51-57), rain (61-67), snow (71-77) as moderate", () => {
    expect(describeWmoCode(53).condition).toBe("drizzle");
    expect(describeWmoCode(63).condition).toBe("rain");
    expect(describeWmoCode(73).condition).toBe("snow");
    expect(describeWmoCode(53).severity).toBe("moderate");
    expect(describeWmoCode(63).severity).toBe("moderate");
    expect(describeWmoCode(73).severity).toBe("moderate");
  });

  it("classifies thunderstorm (95/96/99) as severe", () => {
    expect(describeWmoCode(95).condition).toBe("thunderstorm");
    expect(describeWmoCode(96).severity).toBe("severe");
    expect(describeWmoCode(99).severity).toBe("severe");
  });

  it("returns unknown for codes outside the WMO table", () => {
    expect(describeWmoCode(1234).condition).toBe("unknown");
  });
});

describe("timeOfDayFromHour", () => {
  it("maps the canonical hours to regimes", () => {
    expect(timeOfDayFromHour(7)).toBe("early_morning");
    expect(timeOfDayFromHour(12)).toBe("midday");
    expect(timeOfDayFromHour(15)).toBe("afternoon");
    expect(timeOfDayFromHour(19)).toBe("evening");
    expect(timeOfDayFromHour(23)).toBe("night");
    expect(timeOfDayFromHour(2)).toBe("night");
  });

  it("treats boundary hours correctly", () => {
    expect(timeOfDayFromHour(5)).toBe("early_morning");
    expect(timeOfDayFromHour(10)).toBe("midday");
    expect(timeOfDayFromHour(14)).toBe("afternoon");
    expect(timeOfDayFromHour(18)).toBe("evening");
    expect(timeOfDayFromHour(21)).toBe("night");
  });
});

describe("localHourFromIso", () => {
  it("extracts the hour from Open-Meteo's local-time strings", () => {
    expect(localHourFromIso("2026-04-19T07:00")).toBe(7);
    expect(localHourFromIso("2026-04-19T22:00")).toBe(22);
    expect(localHourFromIso("2026-04-19T00:30")).toBe(0);
  });

  it("falls back to a sane default for malformed input", () => {
    const v = localHourFromIso("not-a-date");
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(24);
  });
});
