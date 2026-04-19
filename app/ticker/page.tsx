'use client';

import { useEffect, useState } from 'react';

interface SandwichEvent {
  id: string;
  timestamp: string;
  mood: string;
  weather: string;
  sandwich: string;
  reasoning: string;
  location?: string;
}

export default function TickerPage() {
  const [events, setEvents] = useState<SandwichEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/ticker');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (err) {
        console.error('Ticker page fetch failed', err);
      }
    };

    fetchEvents();
    const interval = window.setInterval(fetchEvents, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-foreground font-mono p-8 overflow-hidden">
      <div className="max-w-7xl mx-auto border-4 border-foreground/30 p-12 bg-card-bg relative">
        <div className="absolute top-0 left-0 bg-foreground text-background px-4 py-1 text-sm font-black">
          LIVE FEED: GLOBAL DIETARY TELEMETRY
        </div>
        
        <div className="mt-8 space-y-8">
          {events.length === 0 ? (
            <div className="text-4xl animate-pulse text-center py-20">
              [ AWAITING INCOMING TELEMETRY SIGNALS... ]
            </div>
          ) : (
            events.map((event, idx) => (
              <div 
                key={event.id || idx} 
                className="border-b border-foreground/10 pb-6 animate-in slide-in-from-right duration-500"
              >
                <div className="flex justify-between items-start mb-2 text-xs opacity-60">
                  <span>ID: {event.id?.slice(-8) || 'LOCAL_UNIT_' + idx}</span>
                  <span>TIME: {new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-3xl font-black flex items-center gap-4">
                  <span className="text-red-500">{event.location?.toUpperCase() || 'UNKNOWN_COORD'}</span>
                  <span className="text-text-dim px-2 border border-text-dim text-sm uppercase">MOOD: {event.mood}</span>
                  <span className="bg-foreground text-background px-3 py-1 text-xl">
                    SANDWICH: {event.sandwich.toUpperCase()}
                  </span>
                </div>
                <p className="mt-4 text-xl italic opacity-80 leading-relaxed border-l-2 border-foreground/30 pl-4">
                  "{event.reasoning}"
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-20 flex justify-between items-end border-t border-foreground/50 pt-8 opacity-40">
          <div>
            NODE: 0x482b...f39c
            <br />
            VERSION: 2.0.4-BETA
          </div>
          <div className="text-right">
            NETWORKS: [ SOLANA_DEVNET ] [ SNOWFLAKE_CORTEX ] [ MONGODB_ATLAS ]
          </div>
        </div>
      </div>
    </div>
  );
}
