import type { TimeOfDay } from "@/lib/weather";

export const APPROVED_SANDWICHES = [
  "Grilled Cheese",
  "BLT",
  "Cuban",
  "Reuben",
  "Banh Mi",
  "Croque Monsieur",
  "Croque Madame",
  "Italian Sub",
  "French Dip",
  "Tuna Melt",
  "Caprese",
  "Philly Cheesesteak",
  "Muffuletta",
  "Monte Cristo",
  "Patty Melt",
  "Pulled Pork Sandwich",
  "Chicken Caesar Wrap",
  "Egg Salad",
  "Peanut Butter & Jelly",
  "Roast Beef on Rye",
  "Pastrami on Rye",
  "Lobster Roll",
  "Shrimp Po' Boy",
  "Falafel Pita",
  "Chicken Parmesan Sub",
  "Bacon Egg & Cheese",
  "Turkey Club",
  "Sloppy Joe",
  "Meatball Sub",
  "Chickpea Salad Sandwich",
  "Tea Sandwich",
  "Veggie Banh Mi",
  "Smoked Salmon Bagel",
  "Choripán",
  "Torta",
  "Gyro",
  "Shawarma Wrap",
  "Katsu Sando",
  "Egg Mayo Sando",
  "Bocadillo de Jamón",
] as const;

export type ApprovedSandwich = (typeof APPROVED_SANDWICHES)[number];

export function isApprovedSandwich(name: unknown): name is ApprovedSandwich {
  return typeof name === "string" && (APPROVED_SANDWICHES as readonly string[]).includes(name);
}

export interface NutritionRegime {
  label: string;
  goal: string;
  prioritizeNutrients: string[];
  preferIngredients: string[];
  avoidIngredients: string[];
  fallbackSandwich: ApprovedSandwich;
}

export const NUTRITION_REGIMES: Record<TimeOfDay, NutritionRegime> = {
  early_morning: {
    label: "early morning (wake-up)",
    goal: "Energize the user — boost alertness and provide steady protein + fat",
    prioritizeNutrients: ["protein", "B12", "tyrosine", "complex carbs"],
    preferIngredients: ["egg", "bacon", "smoked salmon", "sharp cheddar", "spinach", "avocado", "sourdough"],
    avoidIngredients: ["heavy red meat", "deep fried items", "cream sauces"],
    fallbackSandwich: "Bacon Egg & Cheese",
  },
  midday: {
    label: "midday (sustained focus)",
    goal: "Balanced sandwich — sustained energy without a crash, moderate carbs + protein",
    prioritizeNutrients: ["lean protein", "fiber", "healthy fats"],
    preferIngredients: ["turkey", "chicken", "roast beef", "whole grain bread", "lettuce", "tomato", "mustard"],
    avoidIngredients: ["excess cheese", "heavy gravies"],
    fallbackSandwich: "Turkey Club",
  },
  afternoon: {
    label: "afternoon (light reset)",
    goal: "Lighter, fresher sandwich to avoid the post-lunch dip",
    prioritizeNutrients: ["vitamin C", "hydration", "healthy fats"],
    preferIngredients: ["mozzarella", "tomato", "basil", "cucumber", "fresh herbs", "olive oil"],
    avoidIngredients: ["fried meats", "heavy cheese"],
    fallbackSandwich: "Caprese",
  },
  evening: {
    label: "evening (comforting)",
    goal: "Hearty, satisfying sandwich for end of day",
    prioritizeNutrients: ["protein", "iron", "umami"],
    preferIngredients: ["pastrami", "corned beef", "swiss", "rye bread", "sauerkraut", "russian dressing"],
    avoidIngredients: ["high caffeine", "extreme spice"],
    fallbackSandwich: "Reuben",
  },
  night: {
    label: "late night (sleep-supporting)",
    goal: "Light, magnesium- and tryptophan-rich choices that won't sabotage sleep",
    prioritizeNutrients: ["magnesium", "tryptophan", "calcium", "complex carbs"],
    preferIngredients: ["turkey", "almond butter", "banana", "spinach", "warm cheese", "whole grain bread", "honey"],
    avoidIngredients: ["bacon", "deep fried", "spicy peppers", "extra cheese", "caffeine"],
    fallbackSandwich: "Peanut Butter & Jelly",
  },
};

export function fallbackSandwichFor(timeOfDay: TimeOfDay, weatherCondition?: string): ApprovedSandwich {
  const w = (weatherCondition || "").toLowerCase();
  if (timeOfDay === "night") return "Peanut Butter & Jelly";
  if (/(thunder|storm|hurricane|tornado|blizzard)/.test(w)) return "Reuben";
  if (/(rain|drizzle|snow|cold|fog|mist)/.test(w)) return "Grilled Cheese";
  if (/(clear|sun|hot|warm)/.test(w)) return "Caprese";
  return NUTRITION_REGIMES[timeOfDay].fallbackSandwich;
}

// ---------------------------------------------------------------------------
// Nutrition contract
// ---------------------------------------------------------------------------

export interface NutritionMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface NutritionMicros {
  vitamin_a_iu: number;
  vitamin_c_mg: number;
  vitamin_d_iu: number;
  vitamin_e_mg: number;
  vitamin_k_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  phosphorus_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  sodium_mg: number;
}

export interface Nutrition {
  calories: number;
  macros: NutritionMacros;
  micros: NutritionMicros;
}

export const MICRO_KEYS: (keyof NutritionMicros)[] = [
  "vitamin_a_iu",
  "vitamin_c_mg",
  "vitamin_d_iu",
  "vitamin_e_mg",
  "vitamin_k_mcg",
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "phosphorus_mg",
  "potassium_mg",
  "zinc_mg",
  "sodium_mg",
];

export const MACRO_KEYS: (keyof NutritionMacros)[] = [
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
];

// Reasonable per-sandwich defaults for when the model fails to produce a
// usable nutrition block. These are coarse single-serving estimates that
// keep the UI from breaking — they are NOT meant to be precise.
export function defaultNutrition(): Nutrition {
  return {
    calories: 480,
    macros: { protein_g: 22, carbs_g: 45, fat_g: 22, fiber_g: 3 },
    micros: {
      vitamin_a_iu: 350,
      vitamin_c_mg: 6,
      vitamin_d_iu: 40,
      vitamin_e_mg: 1.2,
      vitamin_k_mcg: 18,
      calcium_mg: 180,
      iron_mg: 3,
      magnesium_mg: 45,
      phosphorus_mg: 220,
      potassium_mg: 380,
      zinc_mg: 2,
      sodium_mg: 820,
    },
  };
}

function num(value: unknown, fallback: number, max = 10000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.min(value, max);
}

/**
 * Coerce whatever Gemini returned in the `nutrition` field into a strict,
 * fully-populated Nutrition object. Missing/garbage fields are filled from
 * a sensible default so downstream UI never has to defend against undefined.
 */
export function sanitizeNutrition(raw: unknown): Nutrition {
  const fallback = defaultNutrition();
  if (!raw || typeof raw !== "object") return fallback;

  const r = raw as Record<string, unknown>;
  const macrosRaw = (r.macros && typeof r.macros === "object" ? r.macros : {}) as Record<
    string,
    unknown
  >;
  const microsRaw = (r.micros && typeof r.micros === "object" ? r.micros : {}) as Record<
    string,
    unknown
  >;

  const macros = MACRO_KEYS.reduce((acc, k) => {
    acc[k] = num(macrosRaw[k], fallback.macros[k], 500);
    return acc;
  }, {} as NutritionMacros);

  const microMaxes: Record<keyof NutritionMicros, number> = {
    vitamin_a_iu: 50000,
    vitamin_c_mg: 2000,
    vitamin_d_iu: 5000,
    vitamin_e_mg: 200,
    vitamin_k_mcg: 1000,
    calcium_mg: 5000,
    iron_mg: 100,
    magnesium_mg: 1000,
    phosphorus_mg: 4000,
    potassium_mg: 6000,
    zinc_mg: 100,
    sodium_mg: 6000,
  };

  const micros = MICRO_KEYS.reduce((acc, k) => {
    acc[k] = num(microsRaw[k], fallback.micros[k], microMaxes[k]);
    return acc;
  }, {} as NutritionMicros);

  return {
    calories: num(r.calories, fallback.calories, 3000),
    macros,
    micros,
  };
}

export function buildSystemPrompt(): string {
  const regimeBlock = (Object.keys(NUTRITION_REGIMES) as TimeOfDay[])
    .map((k) => {
      const r = NUTRITION_REGIMES[k];
      return `- ${k} → ${r.label}. Goal: ${r.goal}. Prioritize: ${r.prioritizeNutrients.join(", ")}. Prefer: ${r.preferIngredients.join(", ")}. Avoid: ${r.avoidIngredients.join(", ")}.`;
    })
    .join("\n");

  return `You are the world's most dramatic sandwich advisor. You select ONE real, well-known sandwich for the user given their mood, weather, and the local time-of-day. You also explain which ingredients matter at this hour AND provide a realistic nutrition estimate for one standard serving.

Hard rules:
- The "sandwich" field MUST be one of these exact names (do not modify, do not invent): ${APPROVED_SANDWICHES.join(", ")}.
- Pick the sandwich that best matches mood + weather + time-of-day. Different conditions warrant different choices.
- "ingredients" must be a 3-6 item array of the sandwich's actual ingredients (or close substitutions). Lean into ingredients that fit the time-of-day nutritional regime below.
- "confidence" must be a number between 94.7 and 99.3.
- "urgency" must be one of: CRITICAL, HIGH, MODERATE, ELEVATED.
- "reasoning" should be 1-3 sentences, dramatic and philosophical, but anchored to the actual sandwich, the mood, the weather, AND the time-of-day nutritional goal (mention the relevant nutrient like magnesium / tryptophan / B12 / etc. when appropriate).
- "nutrition" MUST be present with realistic per-serving estimates (within ~10% of typical USDA values). Required shape:
    {
      "calories": <number>,
      "macros": {
        "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>, "fiber_g": <number>
      },
      "micros": {
        "vitamin_a_iu": <number>, "vitamin_c_mg": <number>, "vitamin_d_iu": <number>,
        "vitamin_e_mg": <number>, "vitamin_k_mcg": <number>,
        "calcium_mg": <number>, "iron_mg": <number>, "magnesium_mg": <number>,
        "phosphorus_mg": <number>, "potassium_mg": <number>, "zinc_mg": <number>,
        "sodium_mg": <number>
      }
    }
  All twelve micronutrients are required even if the value is small (use 0 only when truly negligible). Use the canonical units: IU for Vitamin A and D, mg for C/E and minerals, mcg for Vitamin K. Do not include any other fields, do not nest values inside strings, do not use ranges — single numbers only.

Time-of-day nutritional regimes:
${regimeBlock}

Return STRICT JSON only — no markdown, no code fences, no commentary:
{
  "sandwich": "<exact name from approved list>",
  "ingredients": ["...", "..."],
  "reasoning": "...",
  "confidence": 97.3,
  "urgency": "ELEVATED",
  "nutrition": {
    "calories": 480,
    "macros": { "protein_g": 22, "carbs_g": 45, "fat_g": 22, "fiber_g": 3 },
    "micros": {
      "vitamin_a_iu": 350, "vitamin_c_mg": 6, "vitamin_d_iu": 40,
      "vitamin_e_mg": 1.2, "vitamin_k_mcg": 18,
      "calcium_mg": 180, "iron_mg": 3, "magnesium_mg": 45,
      "phosphorus_mg": 220, "potassium_mg": 380, "zinc_mg": 2, "sodium_mg": 820
    }
  }
}`;
}
