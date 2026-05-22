import type { LiveQueryEvent } from "@mydns/shared";

type EventMap = {
  query: LiveQueryEvent;
  "rules:updated": { type: "rules:updated" };
  "blocklist:sync": { type: "blocklist:sync"; status: string; entryCount: number };
  "stats:tick": { type: "stats:tick"; total: number; blocked: number };
};

type Listener<T> = (event: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener<unknown>);
    return () => this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(data);
      } catch (err) {
        console.error(`[event-bus] Error in ${event} listener:`, err);
      }
    }
  }
}

export const eventBus = new EventBus();

export type WsClient = {
  send: (data: string) => void;
};

const wsClients = new Set<WsClient>();

// Throttle broadcast query events (max ~100/s globally)
let wsQueryCount = 0;
let wsQueryWindowStart = Date.now();
const WS_MAX_PER_SECOND = 100;

export function addWsClient(client: WsClient): void {
  wsClients.add(client);
}

export function removeWsClient(client: WsClient): void {
  wsClients.delete(client);
}

export function broadcastWs(data: unknown): void {
  const payload = JSON.stringify(data);
  for (const client of wsClients) {
    try {
      client.send(payload);
    } catch {
      wsClients.delete(client);
    }
  }
}

function throttledQueryBroadcast(event: LiveQueryEvent): void {
  const now = Date.now();
  if (now - wsQueryWindowStart >= 1000) {
    wsQueryWindowStart = now;
    wsQueryCount = 0;
  }
  wsQueryCount++;
  if (wsQueryCount > WS_MAX_PER_SECOND) return;
  broadcastWs(event);
}

eventBus.on("query", (event) => throttledQueryBroadcast(event));
eventBus.on("rules:updated", (event) => broadcastWs(event));
eventBus.on("blocklist:sync", (event) => broadcastWs(event));
eventBus.on("stats:tick", (event) => broadcastWs(event));
