const TOKEN_KEY = "mydns_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Non autorisé");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Erreur serveur");
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { _id: string; username: string; createdAt: string } }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
    ),
  me: () => request<{ _id: string; username: string; createdAt: string }>("/api/v1/auth/me"),
  statsOverview: () => request<import("@mydns/shared").StatsOverview>("/api/v1/stats/overview"),
  statsTimeline: (period = "24h") =>
    request<import("@mydns/shared").TimelinePoint[]>(`/api/v1/stats/timeline?period=${period}`),
  topDomains: (limit = 20) =>
    request<import("@mydns/shared").TopEntry[]>(`/api/v1/stats/top/domains?limit=${limit}`),
  topBlocked: (limit = 20) =>
    request<import("@mydns/shared").TopEntry[]>(`/api/v1/stats/top/blocked?limit=${limit}`),
  topClients: (limit = 20) =>
    request<import("@mydns/shared").TopClient[]>(`/api/v1/stats/top/clients?limit=${limit}`),
  queries: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    return request<import("@mydns/shared").PaginatedResponse<import("@mydns/shared").QueryLog>>(
      `/api/v1/queries?${qs}`,
    );
  },
  deleteQueries: () => request<{ deleted: number }>("/api/v1/queries", { method: "DELETE" }),
  exportQueries: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, v);
    }
    const token = getToken();
    return fetch(`/api/v1/queries/export?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (res) => {
      if (!res.ok) throw new Error("Export échoué");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mydns-queries.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  },
  blocklistSources: () => request<import("@mydns/shared").BlocklistSource[]>("/api/v1/blocklists/sources"),
  createBlocklistSource: (data: unknown) =>
    request<import("@mydns/shared").BlocklistSource>("/api/v1/blocklists/sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateBlocklistSource: (id: string, data: unknown) =>
    request<import("@mydns/shared").BlocklistSource>(`/api/v1/blocklists/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteBlocklistSource: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/blocklists/sources/${id}`, { method: "DELETE" }),
  syncBlocklists: () =>
    request<{ entryCount: number; syncing: boolean; lastSyncAt: string | null }>(
      "/api/v1/blocklists/sync-all",
      { method: "POST" },
    ),
  blocklistStatus: () =>
    request<{ syncing: boolean; lastSyncAt: string | null; entryCount: number }>(
      "/api/v1/blocklists/status",
    ),
  rules: (type?: string) =>
    request<import("@mydns/shared").Rule[]>(`/api/v1/rules${type ? `?type=${type}` : ""}`),
  createRule: (data: unknown) =>
    request<import("@mydns/shared").Rule>("/api/v1/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id: string, data: unknown) =>
    request<import("@mydns/shared").Rule>(`/api/v1/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteRule: (id: string) => request<{ ok: boolean }>(`/api/v1/rules/${id}`, { method: "DELETE" }),
  devices: () => request<import("@mydns/shared").Device[]>("/api/v1/devices"),
  getDevice: (id: string) => request<import("@mydns/shared").Device>(`/api/v1/devices/${id}`),
  deviceQueries: (id: string, page = 1, limit = 50) =>
    request<import("@mydns/shared").PaginatedResponse<import("@mydns/shared").QueryLog>>(
      `/api/v1/devices/${id}/queries?page=${page}&limit=${limit}`,
    ),
  updateDevice: (id: string, data: unknown) =>
    request<import("@mydns/shared").Device>(`/api/v1/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  settings: () => request<import("@mydns/shared").Settings>("/api/v1/settings"),
  updateSettings: (data: unknown) =>
    request<import("@mydns/shared").Settings>("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/v1/settings/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  systemInfo: () => request<import("@mydns/shared").SystemInfo>("/api/v1/system/info"),
  flushCache: () => request<{ ok: boolean }>("/api/v1/system/cache/flush", { method: "POST" }),
};
