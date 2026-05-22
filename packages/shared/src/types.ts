export type BlockResponse = "nxdomain" | "null_ip";
export type QueryAction = "allowed" | "blocked" | "cached";
export type RuleType = "allow" | "deny";
export type PatternType = "exact" | "wildcard" | "regex";
export type BlocklistFormat = "hosts" | "domains" | "adblock";
export type SyncSchedule = "daily" | "weekly" | "manual";
export type SyncStatus = "ok" | "error" | "pending";

export interface Settings {
  _id: "global";
  upstreams: string[];
  blockResponse: BlockResponse;
  cacheMaxEntries: number;
  cacheMinTtl: number;
  cacheMaxTtl: number;
  logRetentionDays: number;
  logBlockedOnly: boolean;
  rateLimitPerIp: number;
  updatedAt: string;
}

export interface BlocklistSource {
  _id: string;
  name: string;
  url: string;
  enabled: boolean;
  format: BlocklistFormat;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus;
  entryCount: number;
  schedule: SyncSchedule;
}

export interface Rule {
  _id: string;
  type: RuleType;
  pattern: string;
  patternType: PatternType;
  comment: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
}

export interface QueryLog {
  _id: string;
  timestamp: string;
  clientIp: string;
  clientMac: string | null;
  deviceId: string | null;
  domain: string;
  qtype: number;
  action: QueryAction;
  blockReason: string | null;
  responseTimeMs: number;
  upstream: string | null;
}

export interface Device {
  _id: string;
  ip: string;
  mac: string | null;
  hostname: string | null;
  alias: string | null;
  firstSeen: string;
  lastSeen: string;
  queryCount: number;
  blockedCount: number;
  tags: string[];
}

export interface StatsHourly {
  _id: string;
  hour: string;
  totalQueries: number;
  blockedQueries: number;
  uniqueClients: number;
  topDomains: Array<{ domain: string; count: number }>;
  topBlocked: Array<{ domain: string; count: number }>;
  topClients: Array<{ ip: string; count: number }>;
}

export interface StatsOverview {
  totalQueries24h: number;
  blockedQueries24h: number;
  blockedPercent: number;
  activeClients24h: number;
  cacheHitRate: number;
  blocklistEntries: number;
  uptime: number;
}

export interface TimelinePoint {
  hour: string;
  total: number;
  blocked: number;
}

export interface TopEntry {
  domain: string;
  count: number;
}

export interface TopClient {
  ip: string;
  alias: string | null;
  count: number;
}

export interface SystemInfo {
  version: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  cache: {
    size: number;
    maxEntries: number;
    hits: number;
    misses: number;
  };
  blocklist: {
    entries: number;
    lastSync: string | null;
  };
  dns: {
    port: number;
    queriesTotal: number;
    queriesBlocked: number;
  };
}

export interface LiveQueryEvent {
  type: "query";
  data: {
    timestamp: string;
    clientIp: string;
    domain: string;
    action: QueryAction;
    blockReason: string | null;
    responseTimeMs: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  _id: string;
  username: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface BlockDecision {
  blocked: boolean;
  reason: string | null;
}

export const DEFAULT_SETTINGS: Omit<Settings, "updatedAt"> = {
  _id: "global",
  upstreams: ["1.1.1.1", "8.8.8.8"],
  blockResponse: "null_ip",
  cacheMaxEntries: 10000,
  cacheMinTtl: 60,
  cacheMaxTtl: 86400,
  logRetentionDays: 7,
  logBlockedOnly: false,
  rateLimitPerIp: 100,
};

export const DEFAULT_BLOCKLIST_SOURCES: Omit<BlocklistSource, "_id" | "lastSyncAt" | "lastSyncStatus" | "entryCount">[] = [
  {
    name: "Steven Black Unified",
    url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    enabled: true,
    format: "hosts",
    schedule: "daily",
  },
  {
    name: "OISD Big",
    url: "https://big.oisd.nl/domainswild",
    enabled: true,
    format: "domains",
    schedule: "daily",
  },
];
