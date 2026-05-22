import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config/index.js";
import type { InMemoryStore } from "../memory/store.js";
import type { DnsCache } from "../dns/cache.js";
import type { DnsHandler } from "../dns/handler.js";
import type { BlocklistService } from "../services/blocklist.service.js";
import { authMiddleware, createToken, hashPassword, verifyPassword } from "./middleware/auth.js";
import { securityHeadersMiddleware, apiRateLimitMiddleware } from "./middleware/security.js";
import { repositories } from "../db/repositories.js";
import { reloadRules } from "../services/blocklist.service.js";
import { queryLogsToCsv } from "../utils/csv.js";
import {
  loginSchema,
  updateSettingsSchema,
  createRuleSchema,
  updateRuleSchema,
  createBlocklistSourceSchema,
  updateBlocklistSourceSchema,
  updateDeviceSchema,
  queryFiltersSchema,
  changePasswordSchema,
} from "@mydns/shared";

const startTime = Date.now();

export function createApp(
  config: AppConfig,
  store: InMemoryStore,
  cache: DnsCache,
  dnsHandler: DnsHandler,
  blocklistService: BlocklistService,
) {
  const app = new Hono();
  const auth = authMiddleware(config);

  app.use("*", securityHeadersMiddleware());
  app.use("/api/*", apiRateLimitMiddleware());

  app.get("/health", async (c) => {
    try {
      await repositories.getSettings();
      return c.json({ status: "ok", dns: true, mongo: true });
    } catch {
      return c.json({ status: "degraded", dns: true, mongo: false }, 503);
    }
  });

  app.post("/api/v1/auth/login", async (c) => {
    const body = loginSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: "Données invalides" }, 400);
    const user = await repositories.getUser(body.data.username);
    if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
      return c.json({ error: "Identifiants incorrects" }, 401);
    }
    const token = await createToken(user.username, config.jwtSecret);
    return c.json({
      token,
      user: { _id: user._id.toString(), username: user.username, createdAt: user.createdAt.toISOString() },
    });
  });

  app.get("/api/v1/auth/me", auth, async (c) => {
    const username = c.get("username");
    const user = await repositories.getUser(username);
    if (!user) return c.json({ error: "Utilisateur introuvable" }, 404);
    return c.json({ _id: user._id.toString(), username: user.username, createdAt: user.createdAt.toISOString() });
  });

  app.get("/api/v1/stats/overview", auth, async (c) => {
    const since = new Date(Date.now() - 86400000);
    const overview = await repositories.getStatsOverview(since);
    return c.json({
      totalQueries24h: overview.total,
      blockedQueries24h: overview.blocked,
      blockedPercent: overview.total === 0 ? 0 : Math.round((overview.blocked / overview.total) * 100),
      activeClients24h: overview.clients,
      cacheHitRate: Math.round(cache.hitRate * 100),
      blocklistEntries: store.blocklistSize,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  app.get("/api/v1/stats/timeline", auth, async (c) => {
    const period = c.req.query("period") ?? "24h";
    const hours = period === "7d" ? 168 : 24;
    const since = new Date(Date.now() - hours * 3600000);
    const timeline = await repositories.getTimeline(since);
    return c.json(
      timeline.map((t) => ({
        hour: t.hour.toISOString(),
        total: t.total,
        blocked: t.blocked,
      })),
    );
  });

  app.get("/api/v1/stats/top/domains", auth, async (c) => {
    const limit = Number(c.req.query("limit") ?? 20);
    const since = new Date(Date.now() - 86400000);
    return c.json(await repositories.getTopDomains(since, limit));
  });

  app.get("/api/v1/stats/top/blocked", auth, async (c) => {
    const limit = Number(c.req.query("limit") ?? 20);
    const since = new Date(Date.now() - 86400000);
    return c.json(await repositories.getTopBlocked(since, limit));
  });

  app.get("/api/v1/stats/top/clients", auth, async (c) => {
    const limit = Number(c.req.query("limit") ?? 20);
    const since = new Date(Date.now() - 86400000);
    const clients = await repositories.getTopClients(since, limit);
    const devices = await repositories.listDevices();
    const aliasMap = new Map(devices.map((d) => [d.ip, d.alias]));
    return c.json(clients.map((cl) => ({ ...cl, alias: aliasMap.get(cl.ip) ?? null })));
  });

  app.get("/api/v1/queries", auth, async (c) => {
    const filters = queryFiltersSchema.safeParse(c.req.query());
    if (!filters.success) return c.json({ error: "Filtres invalides" }, 400);
    const { page, limit, action, domain, clientIp, from, to } = filters.data;
    const result = await repositories.queryLogs({ page, limit, action, domain, clientIp, from, to });
    return c.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  });

  app.delete("/api/v1/queries", auth, async (c) => {
    const count = await repositories.deleteAllQueryLogs();
    return c.json({ deleted: count });
  });

  app.get("/api/v1/queries/export", auth, async (c) => {
    const action = c.req.query("action");
    const domain = c.req.query("domain");
    const clientIp = c.req.query("clientIp");
    const from = c.req.query("from");
    const to = c.req.query("to");
    const logs = await repositories.exportQueryLogs({ action, domain, clientIp, from, to });
    const csv = queryLogsToCsv(logs);
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", 'attachment; filename="mydns-queries.csv"');
    return c.body(csv);
  });

  app.get("/api/v1/blocklists/sources", auth, async (c) => {
    return c.json(await repositories.listBlocklistSources());
  });

  app.post("/api/v1/blocklists/sources", auth, async (c) => {
    const body = createBlocklistSourceSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const source = await repositories.createBlocklistSource(body.data);
    return c.json(source, 201);
  });

  app.patch("/api/v1/blocklists/sources/:id", auth, async (c) => {
    const body = updateBlocklistSourceSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const source = await repositories.updateBlocklistSource(c.req.param("id"), body.data);
    if (!source) return c.json({ error: "Source introuvable" }, 404);
    return c.json(source);
  });

  app.delete("/api/v1/blocklists/sources/:id", auth, async (c) => {
    const ok = await repositories.deleteBlocklistSource(c.req.param("id"));
    if (!ok) return c.json({ error: "Source introuvable" }, 404);
    return c.json({ ok: true });
  });

  app.post("/api/v1/blocklists/sources/:id/sync", auth, async (c) => {
    await blocklistService.syncOne(c.req.param("id"));
    return c.json(blocklistService.getStatus());
  });

  app.post("/api/v1/blocklists/sync-all", auth, async (c) => {
    const result = await blocklistService.syncAll();
    return c.json({ ...blocklistService.getStatus(), ...result });
  });

  app.get("/api/v1/blocklists/status", auth, async (c) => {
    return c.json(blocklistService.getStatus());
  });

  app.get("/api/v1/rules", auth, async (c) => {
    const type = c.req.query("type") as "allow" | "deny" | undefined;
    return c.json(await repositories.listRules(type));
  });

  app.post("/api/v1/rules", auth, async (c) => {
    const body = createRuleSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const rule = await repositories.createRule({ ...body.data, comment: body.data.comment ?? null });
    await reloadRules(store);
    return c.json(rule, 201);
  });

  app.patch("/api/v1/rules/:id", auth, async (c) => {
    const body = updateRuleSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const rule = await repositories.updateRule(c.req.param("id"), body.data);
    if (!rule) return c.json({ error: "Règle introuvable" }, 404);
    await reloadRules(store);
    return c.json(rule);
  });

  app.delete("/api/v1/rules/:id", auth, async (c) => {
    const ok = await repositories.deleteRule(c.req.param("id"));
    if (!ok) return c.json({ error: "Règle introuvable" }, 404);
    await reloadRules(store);
    return c.json({ ok: true });
  });

  app.get("/api/v1/devices", auth, async (c) => {
    return c.json(await repositories.listDevices());
  });

  app.get("/api/v1/devices/:id", auth, async (c) => {
    const device = await repositories.getDevice(c.req.param("id"));
    if (!device) return c.json({ error: "Appareil introuvable" }, 404);
    return c.json(device);
  });

  app.patch("/api/v1/devices/:id", auth, async (c) => {
    const body = updateDeviceSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const device = await repositories.updateDevice(c.req.param("id"), body.data);
    if (!device) return c.json({ error: "Appareil introuvable" }, 404);
    return c.json(device);
  });

  app.get("/api/v1/devices/:id/queries", auth, async (c) => {
    const device = await repositories.getDevice(c.req.param("id"));
    if (!device) return c.json({ error: "Appareil introuvable" }, 404);
    const page = Number(c.req.query("page") ?? 1);
    const limit = Number(c.req.query("limit") ?? 50);
    const result = await repositories.queryLogs({ page, limit, clientIp: device.ip });
    return c.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  });

  app.get("/api/v1/settings", auth, async (c) => {
    return c.json(await repositories.getSettings());
  });

  app.patch("/api/v1/settings", auth, async (c) => {
    const body = updateSettingsSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const settings = await repositories.updateSettings(body.data);
    store.updateSettings(settings);
    cache.updateSettings(settings);
    if (body.data.logRetentionDays) await repositories.ensureTtlIndex(body.data.logRetentionDays);
    return c.json(settings);
  });

  app.post("/api/v1/settings/password", auth, async (c) => {
    const body = changePasswordSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: body.error.flatten() }, 400);
    const username = c.get("username");
    const user = await repositories.getUser(username);
    if (!user || !(await verifyPassword(body.data.currentPassword, user.passwordHash))) {
      return c.json({ error: "Mot de passe actuel incorrect" }, 400);
    }
    await repositories.updateUserPassword(username, await hashPassword(body.data.newPassword));
    return c.json({ ok: true });
  });

  app.get("/api/v1/system/info", auth, async (c) => {
    const mem = process.memoryUsage();
    return c.json({
      version: "0.1.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memoryUsage: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      cache: {
        size: cache.size,
        maxEntries: store.settings.cacheMaxEntries,
        hits: cache.hits,
        misses: cache.misses,
      },
      blocklist: { entries: store.blocklistSize, lastSync: blocklistService.getStatus().lastSyncAt },
      dns: {
        port: config.dnsPort,
        queriesTotal: dnsHandler.queriesTotal,
        queriesBlocked: dnsHandler.queriesBlocked,
      },
    });
  });

  app.post("/api/v1/system/cache/flush", auth, async (c) => {
    cache.flush();
    return c.json({ ok: true });
  });

  return app;
}

export function registerProductionStatic(app: Hono): void {
  const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../../web/dist");
  app.use("/assets/*", serveStatic({ root: webDist }));
  app.get("*", serveStatic({ root: webDist, path: "index.html" }));
}
