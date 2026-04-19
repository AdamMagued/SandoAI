import type { SandwichEvent } from "@/lib/snowflake";

export type TickerSubscriber = (event: SandwichEvent) => void;

export class TickerBus {
  private subscribers = new Set<TickerSubscriber>();
  private history: SandwichEvent[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  subscribe(fn: TickerSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  publish(event: SandwichEvent): void {
    this.appendToHistory(event);
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error("Ticker subscriber error:", err);
      }
    }
  }

  /**
   * Populate the history buffer without broadcasting to subscribers. Useful
   * for hydrating from an external store (e.g. MongoDB) on cold-start without
   * spamming already-connected clients.
   */
  seed(events: SandwichEvent[]): void {
    for (const event of events) {
      this.appendToHistory(event);
    }
  }

  private appendToHistory(event: SandwichEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
  }

  getHistory(): SandwichEvent[] {
    return [...this.history];
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }

  reset(): void {
    this.subscribers.clear();
    this.history = [];
  }
}

declare global {
  var __sandoTickerBus: TickerBus | undefined;
}

// Reuse the same bus instance across hot reloads / route invocations so that
// a POST in one request can be delivered to a GET stream opened in another.
export function getTickerBus(): TickerBus {
  if (!globalThis.__sandoTickerBus) {
    globalThis.__sandoTickerBus = new TickerBus();
  }
  return globalThis.__sandoTickerBus;
}
