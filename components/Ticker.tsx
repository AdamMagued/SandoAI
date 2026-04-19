"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface TickerEvent {
  id: string;
  timestamp: string;
  mood: string;
  weather: string;
  sandwich: string;
  reasoning: string;
  confidence: number;
  geolocation?: string;
}

const MAX_EVENTS = 30;

const SEVERE = ["thunder", "storm", "hurricane", "tornado", "blizzard"];
const MODERATE = ["rain", "drizzle", "snow", "wind", "hail"];

function severityFor(weather: string): {
  prefix: string;
  label: string;
  tone: string;
} {
  const w = weather.toLowerCase();
  if (SEVERE.some((s) => w.includes(s))) {
    return { prefix: "🚨 ALERT", label: "ALERT", tone: "text-red-400" };
  }
  if (MODERATE.some((s) => w.includes(s))) {
    return {
      prefix: "⚠️  WARNING",
      label: "WARNING",
      tone: "text-yellow-400",
    };
  }
  return { prefix: "✅ UPDATE", label: "UPDATE", tone: "text-green-400" };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function tickerLine(event: TickerEvent): string {
  const sev = severityFor(event.weather);
  const where = event.geolocation
    ? `USER IN ${event.geolocation.toUpperCase()}`
    : "USER";
  return `${sev.prefix}: ${where} — MOOD: ${event.mood.toUpperCase()} — ${event.weather.toUpperCase()} — DEPLOYING ${event.sandwich.toUpperCase()} PROTOCOL`;
}

export default function Ticker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      const id = setTimeout(() => setStatus("offline"), 0);
      return () => clearTimeout(id);
    }

    const source = new EventSource("/api/ticker");
    sourceRef.current = source;

    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus("offline");

    const handler = (ev: MessageEvent) => {
      try {
        const event = JSON.parse(ev.data) as TickerEvent;
        setEvents((prev) => {
          if (prev.some((e) => e.id === event.id)) return prev;
          return [event, ...prev].slice(0, MAX_EVENTS);
        });
      } catch {
        // ignore malformed frame
      }
    };

    source.addEventListener("sandwich", handler as EventListener);

    return () => {
      source.removeEventListener("sandwich", handler as EventListener);
      source.close();
      sourceRef.current = null;
    };
  }, []);

  const statusLabel =
    status === "live" ? "LIVE" : status === "connecting" ? "CONNECTING" : "OFFLINE";
  const statusColor =
    status === "live"
      ? "bg-green-500"
      : status === "connecting"
      ? "bg-yellow-400"
      : "bg-red-500";

  const marqueeLine = useMemo(() => {
    if (events.length === 0) {
      return "🛰️  AWAITING FIRST SANDWICH VERDICT — GLOBAL CULINARY INTELLIGENCE NETWORK STANDING BY";
    }
    return events
      .slice(0, 8)
      .map(tickerLine)
      .join("   •••   ");
  }, [events]);

  return (
    <section
      aria-label="Live sandwich verdict ticker"
      className="w-full max-w-3xl rounded-lg border border-green-900 bg-black text-green-300 font-mono shadow-[0_0_30px_rgba(34,197,94,0.15)]"
    >
      <header className="flex items-center justify-between border-b border-green-900 px-4 py-2 text-[10px] uppercase tracking-[0.3em]">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${statusColor} ${
              status === "live" ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
          <span className="text-green-500">SandoAI Threat Matrix</span>
          <span className="text-green-900">·</span>
          <span className="text-green-700">{statusLabel}</span>
        </div>
        <span className="text-green-700">
          {events.length} verdict{events.length === 1 ? "" : "s"}
        </span>
      </header>

      <div
        className="overflow-hidden border-b border-green-900 bg-black/60"
        aria-hidden
      >
        <div className="whitespace-nowrap py-2 text-xs text-green-400 animate-[scroll_45s_linear_infinite]">
          <span className="px-6">{marqueeLine}</span>
          <span className="px-6">{marqueeLine}</span>
        </div>
      </div>

      <ol
        role="log"
        aria-live="polite"
        className="max-h-80 overflow-y-auto divide-y divide-green-950"
      >
        {events.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-green-800">
            Awaiting first sandwich verdict from the oracle...
          </li>
        )}
        {events.map((event) => {
          const sev = severityFor(event.weather);
          return (
            <li
              key={event.id}
              className="px-4 py-3 text-sm flex flex-col gap-1 animate-[fadeIn_300ms_ease-out]"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-green-700">
                <span className={`${sev.tone} font-semibold`}>{sev.prefix}</span>
                <span>{formatTime(event.timestamp)}</span>
              </div>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="text-green-600">
                  {event.geolocation
                    ? `USER IN ${event.geolocation.toUpperCase()}`
                    : "USER"}
                </span>
                <span className="text-green-900">·</span>
                <span className="text-green-500">
                  {event.mood.toUpperCase()} / {event.weather.toUpperCase()}
                </span>
                <span className="ml-auto text-green-400">
                  {event.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-green-200">
                Deploying{" "}
                <span className="font-semibold text-green-100">
                  {event.sandwich}
                </span>{" "}
                protocol.
              </div>
              {event.reasoning && (
                <p className="text-[11px] text-green-700 line-clamp-2">
                  {event.reasoning}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <style jsx>{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
