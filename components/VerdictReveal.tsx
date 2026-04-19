"use client";

import { useState } from "react";
import ImmortalizeButton from "./ImmortalizeButton";
import TherapyPanel from "./TherapyPanel";

export interface NutritionMacrosUI {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface NutritionMicrosUI {
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

export interface VerdictNutrition {
  calories: number;
  macros: NutritionMacrosUI;
  micros: NutritionMicrosUI;
}

export interface VerdictPayload {
  sandwich: string;
  reasoning: string;
  confidence: number;
  urgency: string;
  ingredients?: string[];
  timeOfDay?: string;
  nutrition?: VerdictNutrition;
}

export interface VerdictContext {
  mood: string;
  weather: string;
  city?: string;
  timeOfDay?: string;
  localHour?: number;
}

interface Props {
  verdict: VerdictPayload;
  context: VerdictContext;
  onUpdateVerdict?: (verdict: VerdictPayload) => void;
}

function urgencyColor(urgency: string): string {
  switch (urgency.toUpperCase()) {
    case "CRITICAL":
      return "text-red-400 border-red-500";
    case "HIGH":
      return "text-orange-400 border-orange-500";
    case "ELEVATED":
      return "text-yellow-400 border-yellow-500";
    default:
      return "text-green-400 border-green-500";
  }
}

const MICRO_LABELS: Array<{ key: keyof NutritionMicrosUI; label: string; unit: string }> = [
  { key: "vitamin_a_iu", label: "Vit A", unit: "IU" },
  { key: "vitamin_c_mg", label: "Vit C", unit: "mg" },
  { key: "vitamin_d_iu", label: "Vit D", unit: "IU" },
  { key: "vitamin_e_mg", label: "Vit E", unit: "mg" },
  { key: "vitamin_k_mcg", label: "Vit K", unit: "mcg" },
  { key: "calcium_mg", label: "Calcium", unit: "mg" },
  { key: "iron_mg", label: "Iron", unit: "mg" },
  { key: "magnesium_mg", label: "Magnesium", unit: "mg" },
  { key: "phosphorus_mg", label: "Phosphorus", unit: "mg" },
  { key: "potassium_mg", label: "Potassium", unit: "mg" },
  { key: "zinc_mg", label: "Zinc", unit: "mg" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(1).replace(/\.0$/, "");
}

function formatTimeOfDay(t?: string): string {
  switch (t) {
    case "early_morning":
      return "early morning";
    case "midday":
      return "midday";
    case "afternoon":
      return "afternoon";
    case "evening":
      return "evening";
    case "night":
      return "late night";
    default:
      return "";
  }
}

export default function VerdictReveal({ verdict, context, onUpdateVerdict }: Props) {
  const [therapyOpen, setTherapyOpen] = useState(false);
  const colour = urgencyColor(verdict.urgency);
  const tod = formatTimeOfDay(verdict.timeOfDay ?? context.timeOfDay);

  return (
    <section
      aria-label="Sandwich verdict"
      className={`w-full max-w-3xl rounded-lg border ${colour} bg-black/90 p-6 font-mono shadow-xl animate-[reveal_400ms_ease-out]`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-zinc-500">
        <span>Verdict · Urgency {verdict.urgency}</span>
        <span className={colour.split(" ")[0]}>
          {verdict.confidence.toFixed(1)}% confidence
        </span>
      </div>

      <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50">
        Your sandwich is:{" "}
        <span className="text-green-300">{verdict.sandwich}</span>
      </h2>

      <p className="mt-4 text-sm leading-7 text-zinc-300">{verdict.reasoning}</p>

      {verdict.ingredients && verdict.ingredients.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            Ingredient stack
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {verdict.ingredients.map((ing) => (
              <li
                key={ing}
                className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-200"
              >
                {ing}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict.nutrition && (
        <div className="mt-5 rounded border border-zinc-800 bg-zinc-950/80 p-4 text-xs text-zinc-300">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Nutrition (per serving · est.)
            </span>
            <span className="text-base font-bold text-zinc-100">
              {fmt(verdict.nutrition.calories)} kcal
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
            {([
              ["Protein", verdict.nutrition.macros.protein_g, "g"],
              ["Carbs", verdict.nutrition.macros.carbs_g, "g"],
              ["Fat", verdict.nutrition.macros.fat_g, "g"],
              ["Fiber", verdict.nutrition.macros.fiber_g, "g"],
            ] as const).map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded border border-zinc-800 bg-black/40 px-2 py-2"
              >
                <dt className="text-[9px] uppercase tracking-widest text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-zinc-100">
                  {fmt(value)}
                  <span className="ml-0.5 text-[9px] text-zinc-500">{unit}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-3">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">
              Vitamins &amp; minerals
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {MICRO_LABELS.map(({ key, label, unit }) => {
                const value = verdict.nutrition?.micros?.[key];
                return (
                  <div
                    key={key}
                    className="flex items-baseline justify-between rounded border border-zinc-900 bg-black/30 px-2 py-1"
                  >
                    <dt className="text-[10px] text-zinc-400">{label}</dt>
                    <dd className="text-[10px] font-mono text-zinc-100">
                      {fmt(value ?? 0)}
                      <span className="ml-0.5 text-[9px] text-zinc-500">{unit}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-widest text-zinc-600">
            Estimates from Gemini · ±10% typical
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-500">
        Detected mood:{" "}
        <span className="text-zinc-200">{context.mood}</span> · Weather:{" "}
        <span className="text-zinc-200">{context.weather}</span>
        {context.city && (
          <>
            {" "}
            · Location: <span className="text-zinc-200">{context.city}</span>
          </>
        )}
        {tod && (
          <>
            {" "}
            · Time: <span className="text-zinc-200">{tod}</span>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <ImmortalizeButton verdict={verdict} context={context} />
        <button
          type="button"
          onClick={() => setTherapyOpen((v) => !v)}
          className="rounded border border-amber-500 bg-black px-3 py-2 text-xs uppercase tracking-widest text-amber-300 hover:bg-amber-500/10"
        >
          {therapyOpen ? "Close therapy session" : "I don't like this — talk to a therapist"}
        </button>
      </div>

      {therapyOpen && (
        <div className="mt-6">
          <TherapyPanel
            verdict={verdict}
            context={context}
            onAdoptVerdict={(v) => {
              onUpdateVerdict?.(v);
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </section>
  );
}
