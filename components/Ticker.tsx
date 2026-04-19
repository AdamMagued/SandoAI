'use client';

import { useEffect, useState } from 'react';

interface SandwichEvent {
  id: string;
  timestamp: string;
  mood: string;
  weather: string;
  sandwich: string;
  reasoning: string;
}

export default function Ticker() {
  const [events, setEvents] = useState<SandwichEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/ticker');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (err) {
        console.error('Ticker fetch failed', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="bg-accent/30 border-y border-foreground/20 py-2 overflow-hidden whitespace-nowrap font-mono text-sm">
        <span className="inline-block animate-pulse">[ INITIALIZING TELEMETRY STREAM... ]</span>
      </div>
    );
  }

  const tickerText = events.map(e => (
    <span key={e.id || Math.random()} className="mx-8">
      <span className="text-red-500">🚨 ALERT:</span> {e.mood.toUpperCase()} IN CAIRO &mdash; {e.weather.toUpperCase()} &mdash; DEPLOYING <span className="underline">{e.sandwich.toUpperCase()}</span> PROTOCOL
    </span>
  ));

  return (
    <div className="bg-accent/30 border-y border-foreground/20 py-2 overflow-hidden whitespace-nowrap font-mono text-sm relative">
      <div className="inline-block animate-marquee whitespace-nowrap">
        {tickerText}
        {tickerText}
      </div>
    </div>
  );
}
