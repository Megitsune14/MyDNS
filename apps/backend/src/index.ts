import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { loadConfig } from "./config/index.js";
import { connectDb, closeDb } from "./db/client.js";
import { initDb, repositories } from "./db/repositories.js";
import { InMemoryStore } from "./memory/store.js";
import { DnsCache } from "./dns/cache.js";
import { DnsHandler } from "./dns/handler.js";
import { DnsServer } from "./dns/server.js";
import { createApp, registerProductionStatic } from "./api/app.js";
import { BlocklistService, reloadRules } from "./services/blocklist.service.js";
import { hashPassword, verifyToken } from "./api/middleware/auth.js";
import { addWsClient, removeWsClient } from "./services/event-bus.js";
import { loadBlocklistSnapshot } from "./services/blocklist-snapshot.js";
import { startLogWriter, stopLogWriter } from "./workers/log-writer.js";
import { startStatsRollup, stopStatsRollup, startBlocklistScheduler } from "./workers/stats-rollup.js";
import { deviceTracker } from "./services/device-tracker.js";

async function bootstrap() {
  const config = loadConfig();
  console.log("[mydns] Starting MyDNS v0.1.0...");

  await connectDb(config.mongodbUri);
  await initDb();
  const syncedDevices = await repositories.syncDevicesFromLogs();
  if (syncedDevices > 0) {
    console.log(`[mydns] Devices synced from query logs: ${syncedDevices}`);
  }

  const settings = await repositories.getSettings();
  await repositories.ensureTtlIndex(settings.logRetentionDays);
  await repositories.ensureDefaultBlocklists();

  const existingUser = await repositories.getUser(config.adminUsername);
  if (!existingUser) {
    await repositories.createUser(config.adminUsername, await hashPassword(config.adminPassword));
    console.log(`[mydns] Admin user created: ${config.adminUsername}`);
  }

  const store = new InMemoryStore(settings);
  await reloadRules(store);

  const cache = new DnsCache(settings);
  const blocklistService = new BlocklistService(store, config.dataDir);

  const snapshot = await loadBlocklistSnapshot(config.dataDir);
  if (snapshot && snapshot.length > 0) {
    const count = store.loadBlocklist(snapshot);
    console.log(`[mydns] Blocklist loaded from snapshot: ${count} entries`);
  }

  console.log("[mydns] Syncing blocklists...");
  try {
    await blocklistService.syncAll();
    console.log(`[mydns] Blocklist synced: ${store.blocklistSize} entries`);
  } catch (err) {
    console.warn("[mydns] Initial blocklist sync failed, continuing:", err);
  }

  const dnsHandler = new DnsHandler(store, cache);
  const dnsServer = new DnsServer(dnsHandler, config.dnsPort, config.dnsBind);
  dnsServer.start();

  startLogWriter();
  startStatsRollup();
  startBlocklistScheduler(async () => {
    await blocklistService.syncAll();
  });

  const app = createApp(config, store, cache, dnsHandler, blocklistService);
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  app.get(
    "/ws/live",
    upgradeWebSocket((c) => {
      const token = c.req.query("token");
      let clientRef: { send: (data: string) => void } | null = null;

      return {
        async onOpen(_event, ws) {
          const user = token ? await verifyToken(token, config.jwtSecret) : null;
          if (!user) {
            ws.close(4401, "Non autorisé");
            return;
          }
          clientRef = { send: (data) => ws.send(data) };
          addWsClient(clientRef);
        },
        onClose(_event, ws) {
          if (clientRef) removeWsClient(clientRef);
          else removeWsClient({ send: (data) => ws.send(data) });
        },
      };
    }),
  );

  if (config.nodeEnv === "production") {
    registerProductionStatic(app);
  }

  const httpServer = serve({
    fetch: app.fetch,
    port: config.httpPort,
    hostname: "0.0.0.0",
  });

  injectWebSocket(httpServer);

  console.log(`[mydns] API listening on http://0.0.0.0:${config.httpPort}`);

  const shutdown = async (signal: string) => {
    console.log(`[mydns] Received ${signal}, shutting down...`);
    dnsServer.stop();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    stopStatsRollup();
    await stopLogWriter();
    await deviceTracker.flush();
    await closeDb();
    console.log("[mydns] Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[mydns] Fatal error:", err);
  process.exit(1);
});
