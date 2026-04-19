import { getSandwichModel } from "@/lib/gemini";
import { NextRequest } from "next/server";
import {
  buildSystemPrompt,
  defaultNutrition,
  fallbackSandwichFor,
  isApprovedSandwich,
  NUTRITION_REGIMES,
  sanitizeNutrition,
} from "@/lib/sandwiches";
import { timeOfDayFromHour, type TimeOfDay } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM_PROMPT = buildSystemPrompt();

interface MoodInput {
  mood?: string;
  description?: string;
}

interface WeatherInput {
  condition?: string;
  description?: string;
  temp?: number;
  severity?: string;
  city?: string;
  isDay?: boolean;
  localHour?: number;
  timeOfDay?: TimeOfDay;
}

function resolveTimeOfDay(weather: WeatherInput): TimeOfDay {
  if (
    weather.timeOfDay &&
    ["early_morning", "midday", "afternoon", "evening", "night"].includes(weather.timeOfDay)
  ) {
    return weather.timeOfDay;
  }
  if (typeof weather.localHour === "number") {
    return timeOfDayFromHour(weather.localHour);
  }
  // Last resort: use the server's local hour. Not ideal, but better than crashing.
  return timeOfDayFromHour(new Date().getHours());
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 97.3;
  if (value < 94.7) return 94.7;
  if (value > 99.3) return 99.3;
  return value;
}

function clampUrgency(value: unknown): string {
  return ["CRITICAL", "HIGH", "MODERATE", "ELEVATED"].includes(value as string)
    ? (value as string)
    : "ELEVATED";
}

function sanitizeIngredients(value: unknown, regimeIngredients: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 6);
    if (cleaned.length >= 3) return cleaned;
  }
  return regimeIngredients.slice(0, 4);
}

export async function POST(request: NextRequest) {
  let mood: MoodInput = {};
  let weather: WeatherInput = {};
  try {
    const body = await request.json();
    mood = body.mood ?? {};
    weather = body.weather ?? {};

    const timeOfDay = resolveTimeOfDay(weather);
    const regime = NUTRITION_REGIMES[timeOfDay];
    const geolocation: string | undefined =
      typeof weather.city === "string" && weather.city.length > 0 ? weather.city : undefined;

    const prompt = `Mood: ${mood.mood ?? "unknown"} — ${mood.description ?? ""}
Weather: ${weather.condition ?? "unknown"} (${weather.description ?? "—"}), ${weather.temp ?? "?"}°C, severity: ${weather.severity ?? "mild"}
Local time-of-day: ${timeOfDay} (${regime.label}). Daylight: ${weather.isDay === false ? "no" : "yes"}.
Nutritional priority right now: ${regime.goal}. Aim for ${regime.prioritizeNutrients.join(", ")}.

What sandwich does this person desperately need RIGHT NOW, and which key ingredients matter most given the time of day?`;

    const model = getSandwichModel(SYSTEM_PROMPT);
    const result = await model.generateContent(prompt);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const verdict = JSON.parse(cleaned);

    if (!isApprovedSandwich(verdict.sandwich)) {
      verdict.sandwich = fallbackSandwichFor(timeOfDay, weather.condition);
    }
    verdict.ingredients = sanitizeIngredients(verdict.ingredients, regime.preferIngredients);
    verdict.confidence = clampConfidence(verdict.confidence);
    verdict.urgency = clampUrgency(verdict.urgency);
    verdict.nutrition = sanitizeNutrition(verdict.nutrition);
    verdict.timeOfDay = timeOfDay;

    // Fire-and-forget telemetry; never block the user response on this.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        mood: mood.mood ?? "unknown",
        weather: weather.condition ?? "unknown",
        sandwich: verdict.sandwich,
        reasoning: verdict.reasoning ?? "",
        confidence: verdict.confidence,
        ingredients: verdict.ingredients,
        timeOfDay,
        geolocation,
      }),
    }).catch(() => {});

    return Response.json(verdict);
  } catch (error) {
    console.error("Sandwich oracle error:", error);
    const timeOfDay = resolveTimeOfDay(weather);
    const regime = NUTRITION_REGIMES[timeOfDay];
    return Response.json({
      sandwich: fallbackSandwichFor(timeOfDay, weather.condition),
      ingredients: regime.preferIngredients.slice(0, 4),
      reasoning:
        "When the algorithms fail, ritual prevails. The oracle defaults to time-honored comfort, calibrated to your hour.",
      confidence: 94.7,
      urgency: "CRITICAL",
      nutrition: defaultNutrition(),
      timeOfDay,
    });
  }
}
