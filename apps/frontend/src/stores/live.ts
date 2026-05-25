import { create } from "zustand";
import type { LiveQueryEvent } from "@mydns/shared";

interface LiveStore {
  queries: LiveQueryEvent["data"][];
  connected: boolean;
  push: (query: LiveQueryEvent["data"]) => void;
  setConnected: (connected: boolean) => void;
  clear: () => void;
}

export const useLiveStore = create<LiveStore>((set) => ({
  queries: [],
  connected: false,
  push: (query) =>
    set((state) => ({
      queries: [query, ...state.queries].slice(0, 500),
    })),
  setConnected: (connected) => set({ connected }),
  clear: () => set({ queries: [] }),
}));

export function connectLiveWs(): () => void {
  const token = localStorage.getItem("mydns_token");
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live${qs}`);
  let reconnectTimer: ReturnType<typeof setTimeout>;

  ws.onopen = () => useLiveStore.getState().setConnected(true);
  ws.onclose = () => {
    useLiveStore.getState().setConnected(false);
    reconnectTimer = setTimeout(connectLiveWs, 3000);
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === "query") useLiveStore.getState().push(data.data);
    } catch {
      /* ignore */
    }
  };

  return () => {
    clearTimeout(reconnectTimer);
    ws.close();
  };
}
