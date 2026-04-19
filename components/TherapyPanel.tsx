"use client";

import { useEffect, useRef, useState } from "react";
import type { VerdictPayload, VerdictContext } from "./VerdictReveal";

interface Turn {
  role: "user" | "therapist";
  text: string;
}

interface SpeechRecognitionEventLite {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

interface SpeechRecognitionLite {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLite) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLite;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  verdict: VerdictPayload;
  context: VerdictContext;
  onAdoptVerdict: (verdict: VerdictPayload) => void;
}

export default function TherapyPanel({ verdict, context, onAdoptVerdict }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<VerdictPayload | null>(null);
  const [error, setError] = useState<string>("");
  const [sttSupported, setSttSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLite | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetedRef = useRef(false);

  // Latest props/state mirrored into refs so the stable handlers below can
  // read them without forcing the React compiler to re-memoize on every change.
  const turnsRef = useRef<Turn[]>(turns);
  const verdictRef = useRef(verdict);
  const contextRef = useRef(context);
  const busyRef = useRef(busy);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  useEffect(() => {
    verdictRef.current = verdict;
  }, [verdict]);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  async function playVoice(text: string): Promise<void> {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("voice unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        window.speechSynthesis.speak(u);
      }
    }
  }

  async function sendMessage(message: string): Promise<void> {
    if (busyRef.current) return;
    setBusy(true);
    setError("");

    const trimmed = message.trim();
    const updatedTurns: Turn[] =
      trimmed.length > 0
        ? [...turnsRef.current, { role: "user", text: trimmed }]
        : turnsRef.current;

    if (trimmed.length > 0) {
      setTurns(updatedTurns);
      setDraft("");
    }

    try {
      const res = await fetch("/api/therapy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict: verdictRef.current,
          context: contextRef.current,
          history: updatedTurns,
          message,
        }),
      });
      if (!res.ok) throw new Error(`therapy http ${res.status}`);
      const data = (await res.json()) as {
        reply: string;
        newVerdict: {
          sandwich: string;
          reasoning: string;
          ingredients: string[];
          confidence: number;
          urgency: string;
          timeOfDay: string;
        } | null;
        resolved: boolean;
      };

      const next: Turn[] = [...updatedTurns, { role: "therapist", text: data.reply }];
      setTurns(next);
      if (data.newVerdict) {
        setPendingVerdict({
          sandwich: data.newVerdict.sandwich,
          reasoning: data.newVerdict.reasoning,
          confidence: data.newVerdict.confidence,
          urgency: data.newVerdict.urgency,
          ingredients: data.newVerdict.ingredients,
          timeOfDay: data.newVerdict.timeOfDay,
        });
      }
      void playVoice(data.reply);
    } catch (err) {
      console.error(err);
      setError("Therapist offline. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function startListening(): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition isn't supported in this browser. Type instead.");
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    const r = new Ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev) => {
      const transcript = Array.from(ev.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        void sendMessage(transcript);
      }
    };
    r.onerror = (ev) => {
      setError(`Microphone error: ${ev.error ?? "unknown"}`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    setListening(true);
    setError("");
    try {
      r.start();
    } catch (err) {
      console.error(err);
      setListening(false);
    }
  }

  function stopListening(): void {
    try {
      recognitionRef.current?.stop();
    } catch {}
  }

  useEffect(() => {
    const id = window.setTimeout(
      () => setSttSupported(getRecognitionCtor() !== null),
      0
    );
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    void sendMessage("");
    // sendMessage closes over refs, so we intentionally don't list it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4 font-mono text-sm text-amber-100">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-amber-400">
        <span>Dr. Pumpernickel · Culinary Therapy Session</span>
        <span>{busy ? "thinking..." : listening ? "listening..." : "ready"}</span>
      </div>

      <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {turns.length === 0 && !busy && (
          <li className="text-xs text-amber-300/80">
            Press the mic and tell Dr. Pumpernickel what isn&apos;t working about your sandwich.
          </li>
        )}
        {turns.map((t, i) => (
          <li
            key={i}
            className={`rounded border px-3 py-2 text-xs leading-6 ${
              t.role === "user"
                ? "border-amber-600 bg-amber-900/30 text-amber-50"
                : "border-amber-800 bg-black/40 text-amber-200"
            }`}
          >
            <div className="text-[9px] uppercase tracking-widest opacity-60">
              {t.role === "user" ? "You" : "Dr. Pumpernickel"}
            </div>
            <div>{t.text}</div>
          </li>
        ))}
        {busy && turns.length === 0 && (
          <li className="text-xs text-amber-300/70">Dr. Pumpernickel is preparing the room...</li>
        )}
      </ol>

      {pendingVerdict && (
        <div className="mt-4 rounded border border-green-600 bg-green-950/30 p-3 text-xs text-green-100">
          <div className="text-[10px] uppercase tracking-widest text-green-400">
            New recommendation
          </div>
          <div className="mt-1 text-sm font-bold text-green-200">
            {pendingVerdict.sandwich}
          </div>
          <p className="mt-1 leading-5 text-green-100/90">{pendingVerdict.reasoning}</p>
          {pendingVerdict.ingredients && pendingVerdict.ingredients.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {pendingVerdict.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="rounded-full border border-green-700 bg-black/30 px-2 py-0.5 text-[10px]"
                >
                  {ing}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onAdoptVerdict(pendingVerdict);
                setPendingVerdict(null);
              }}
              className="rounded border border-green-500 bg-green-500/20 px-3 py-1 text-[11px] uppercase tracking-widest text-green-200 hover:bg-green-500/30"
            >
              Yes, give me this one
            </button>
            <button
              type="button"
              onClick={() => setPendingVerdict(null)}
              className="rounded border border-amber-600 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-widest text-amber-200 hover:bg-amber-900/40"
            >
              Not quite — keep talking
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!sttSupported || busy}
          className={`rounded border px-3 py-2 text-xs uppercase tracking-widest disabled:opacity-50 ${
            listening
              ? "border-red-500 bg-red-500/20 text-red-200"
              : "border-amber-500 bg-black text-amber-200 hover:bg-amber-500/10"
          }`}
        >
          {listening ? "Stop listening" : "Hold to speak"}
        </button>

        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (text) void sendMessage(text);
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="...or type your reply"
            className="flex-1 rounded border border-amber-700 bg-black/40 px-3 py-2 text-xs text-amber-100 placeholder:text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="rounded border border-amber-500 bg-black px-3 py-2 text-xs uppercase tracking-widest text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {!sttSupported && (
        <p className="mt-2 text-[10px] text-amber-400">
          Voice input unavailable in this browser. Use the text input or try Chrome / Edge.
        </p>
      )}
      {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
