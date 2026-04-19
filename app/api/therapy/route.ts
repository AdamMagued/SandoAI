import { NextRequest } from "next/server";
import { getSandwichModel } from "@/lib/gemini";
import {
  APPROVED_SANDWICHES,
  fallbackSandwichFor,
  isApprovedSandwich,
  NUTRITION_REGIMES,
} from "@/lib/sandwiches";
import { type TimeOfDay } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TurnIn {
  role: "user" | "therapist";
  text: string;
}

interface TherapyRequest {
  verdict?: {
    sandwich?: string;
    reasoning?: string;
    ingredients?: string[];
  };
  context?: {
    mood?: string;
    weather?: string;
    city?: string;
    timeOfDay?: TimeOfDay;
  };
  history?: TurnIn[];
  message?: string;
}

interface TherapyResponse {
  reply: string;
  newVerdict?: {
    sandwich: string;
    reasoning: string;
    ingredients: string[];
    confidence: number;
    urgency: string;
    timeOfDay: TimeOfDay;
  } | null;
  resolved: boolean;
}

const SYSTEM_PROMPT = `You are "Dr. Pumpernickel" — a calm, warm, slightly deadpan culinary therapist. The user has just received a sandwich verdict they don't like. Your job is to:
1. Validate their feelings briefly (one sentence). Never moralize, never lecture.
2. Ask ONE focused clarifying question about what they actually want (texture, temperature, protein, comfort level, dietary need, mood, etc.). Just one. Short.
3. After they reply, either ask one more clarifying question OR offer a NEW sandwich pick from the approved list that better matches them.
4. Keep replies SHORT (1-3 sentences, conversational). This will be spoken aloud, so write in flowing speech, no bullet points, no markdown.
5. Stay in character. No emojis. No "as an AI". No disclaimers.

When you are ready to recommend a different sandwich (only after at least one user turn), set "newVerdict" with a sandwich from the approved list. Otherwise leave it null.

Approved sandwiches (use one of these EXACT names if you set newVerdict): ${APPROVED_SANDWICHES.join(", ")}.

Always respond with STRICT JSON only — no markdown, no code fences:
{
  "reply": "what Dr. Pumpernickel says out loud",
  "newVerdict": null | {"sandwich": "<approved name>", "reasoning": "1-2 sentences", "ingredients": ["...", "..."]},
  "resolved": false
}

Set "resolved": true only when you've offered a newVerdict and the user has confirmed they're happy with it (e.g. they said yes / sounds good / I'll take it).`;

function clampHistory(history: TurnIn[] | undefined): TurnIn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((t) => t && (t.role === "user" || t.role === "therapist") && typeof t.text === "string")
    .slice(-10)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 600) }));
}

function buildPrompt(req: TherapyRequest): string {
  const { verdict, context, history, message } = req;
  const tod = context?.timeOfDay ?? "midday";
  const regime = NUTRITION_REGIMES[tod] ?? NUTRITION_REGIMES.midday;
  const trimmedHistory = clampHistory(history);

  const transcript = trimmedHistory
    .map((t) => `${t.role === "user" ? "User" : "Dr. Pumpernickel"}: ${t.text}`)
    .join("\n");

  return `Context:
- Original verdict: ${verdict?.sandwich ?? "unknown"} — ${verdict?.reasoning ?? ""}
- Original ingredients: ${(verdict?.ingredients ?? []).join(", ") || "n/a"}
- Detected mood: ${context?.mood ?? "unknown"}
- Weather: ${context?.weather ?? "unknown"}${context?.city ? ` (${context.city})` : ""}
- Time-of-day: ${tod} — nutritional goal: ${regime.goal}. Prefer: ${regime.preferIngredients.join(", ")}.

Conversation so far:
${transcript || "(no prior turns)"}

User just said: "${(message ?? "").trim() || "(they opened the therapy panel without speaking yet — greet them, validate their feelings about the sandwich, and ask one focused question about what they actually want.)"}"

Respond as Dr. Pumpernickel in the JSON format described.`;
}

function safeParse(raw: string): Partial<TherapyResponse> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Partial<TherapyResponse>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: TherapyRequest = {};
  try {
    body = (await request.json()) as TherapyRequest;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const tod: TimeOfDay = body.context?.timeOfDay ?? "midday";

  try {
    const model = getSandwichModel(SYSTEM_PROMPT);
    const result = await model.generateContent(buildPrompt(body));
    const raw = result.response.text();
    const parsed = safeParse(raw);

    if (!parsed || typeof parsed.reply !== "string" || parsed.reply.length === 0) {
      throw new Error("therapist returned malformed response");
    }

    let newVerdict: TherapyResponse["newVerdict"] = null;
    if (parsed.newVerdict && typeof parsed.newVerdict === "object") {
      const nv = parsed.newVerdict as {
        sandwich?: unknown;
        reasoning?: unknown;
        ingredients?: unknown;
      };
      const sandwich = isApprovedSandwich(nv.sandwich)
        ? nv.sandwich
        : fallbackSandwichFor(tod, body.context?.weather);
      const ingredients = Array.isArray(nv.ingredients)
        ? nv.ingredients
            .filter((v): v is string => typeof v === "string" && v.length > 0)
            .slice(0, 6)
        : NUTRITION_REGIMES[tod].preferIngredients.slice(0, 4);
      newVerdict = {
        sandwich,
        reasoning:
          typeof nv.reasoning === "string" && nv.reasoning.length > 0
            ? nv.reasoning
            : `On reflection, ${sandwich} fits you better right now.`,
        ingredients,
        confidence: 96.4,
        urgency: "ELEVATED",
        timeOfDay: tod,
      };
    }

    const response: TherapyResponse = {
      reply: parsed.reply,
      newVerdict,
      resolved: Boolean(parsed.resolved && newVerdict),
    };
    return Response.json(response);
  } catch (error) {
    console.error("Therapy error:", error);
    const fallback: TherapyResponse = {
      reply:
        "I hear you — that pick wasn't right. Tell me one thing: do you want something warm and comforting, or something fresh and light?",
      newVerdict: null,
      resolved: false,
    };
    return Response.json(fallback);
  }
}
