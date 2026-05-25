import type { QueryAction, QueryLog } from "@mydns/shared";
import type { InMemoryStore } from "../memory/store.js";
import type { DnsCache } from "./cache.js";
import {
  resolveUpstream,
  buildBlockedResponse,
  buildRefusedResponse,
  getQueryInfo,
} from "./resolver.js";
import { eventBus } from "../services/event-bus.js";
import { logQueue } from "../workers/log-writer.js";
import { deviceTracker } from "../services/device-tracker.js";

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export class DnsHandler {
  queriesTotal = 0;
  queriesBlocked = 0;
  private rateLimits = new Map<string, RateLimitBucket>();

  constructor(
    private store: InMemoryStore,
    private cache: DnsCache,
  ) {}

  async handle(query: Buffer, clientIp: string): Promise<Buffer> {
    const start = performance.now();
    this.queriesTotal++;

    if (!this.checkRateLimit(clientIp)) {
      return buildRefusedResponse(query);
    }

    const info = getQueryInfo(query);
    if (!info) return buildRefusedResponse(query);

    const { domain, qtype } = info;
    const decision = this.store.checkDomain(domain);

    if (decision.blocked) {
      this.queriesBlocked++;
      const response = buildBlockedResponse(query, this.store.settings);
      this.emitLog({
        clientIp,
        domain,
        qtype,
        action: "blocked",
        blockReason: decision.reason,
        responseTimeMs: performance.now() - start,
        upstream: null,
      });
      return response;
    }

    const cached = this.cache.get(qtype, domain);
    if (cached) {
      this.emitLog({
        clientIp,
        domain,
        qtype,
        action: "cached",
        blockReason: null,
        responseTimeMs: performance.now() - start,
        upstream: null,
      });
      return cached;
    }

    const result = await resolveUpstream(query, this.store.settings.upstreams);
    if (!result) return buildRefusedResponse(query);

    this.cache.set(qtype, domain, result.response, result.ttl);
    this.emitLog({
      clientIp,
      domain,
      qtype,
      action: "allowed",
      blockReason: null,
      responseTimeMs: performance.now() - start,
      upstream: result.upstream,
    });
    return result.response;
  }

  private checkRateLimit(ip: string): boolean {
    const limit = this.store.settings.rateLimitPerIp;
    const now = Date.now();
    let bucket = this.rateLimits.get(ip);
    if (!bucket) {
      bucket = { tokens: limit, lastRefill: now };
      this.rateLimits.set(ip, bucket);
    }
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsed * limit);
    bucket.lastRefill = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  private emitLog(data: {
    clientIp: string;
    domain: string;
    qtype: number;
    action: QueryAction;
    blockReason: string | null;
    responseTimeMs: number;
    upstream: string | null;
  }): void {
    deviceTracker.track(data.clientIp, data.action === "blocked");

    const settings = this.store.settings;
    if (settings.logBlockedOnly && data.action !== "blocked") return;

    const log: Omit<QueryLog, "_id"> = {
      timestamp: new Date().toISOString(),
      clientIp: data.clientIp,
      clientMac: null,
      deviceId: null,
      domain: data.domain,
      qtype: data.qtype,
      action: data.action,
      blockReason: data.blockReason,
      responseTimeMs: Math.round(data.responseTimeMs),
      upstream: data.upstream,
    };

    logQueue.push(log);

    eventBus.emit("query", {
      type: "query",
      data: {
        timestamp: log.timestamp,
        clientIp: log.clientIp,
        domain: log.domain,
        action: log.action,
        blockReason: log.blockReason,
        responseTimeMs: log.responseTimeMs,
      },
    });
  }
}
