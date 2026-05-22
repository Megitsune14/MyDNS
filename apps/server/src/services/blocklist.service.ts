import type { InMemoryStore } from "../memory/store.js";
import { repositories } from "../db/repositories.js";
import { fetchBlocklist, parseBlocklist } from "./blocklist-parser.js";
import { saveBlocklistSnapshot } from "./blocklist-snapshot.js";
import { eventBus } from "./event-bus.js";

let syncing = false;
let lastSyncAt: string | null = null;

export class BlocklistService {
  constructor(
    private store: InMemoryStore,
    private dataDir: string,
  ) {}

  async syncAll(): Promise<{ entryCount: number }> {
    if (syncing) throw new Error("Sync already in progress");
    syncing = true;
    try {
      const sources = await repositories.listBlocklistSources();
      const enabled = sources.filter((s) => s.enabled);
      const allDomains = new Set<string>();

      for (const source of enabled) {
        try {
          const content = await fetchBlocklist(source.url);
          const domains = parseBlocklist(content, source.format);
          for (const d of domains) allDomains.add(d);
          await repositories.updateBlocklistSource(source._id, {
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: "ok",
            entryCount: domains.length,
          });
        } catch (err) {
          console.error(`[blocklist] Failed to sync ${source.name}:`, err);
          await repositories.updateBlocklistSource(source._id, {
            lastSyncStatus: "error",
          });
        }
      }

      const count = this.store.loadBlocklist(allDomains);
      await saveBlocklistSnapshot(this.dataDir, allDomains);
      lastSyncAt = new Date().toISOString();
      eventBus.emit("blocklist:sync", { type: "blocklist:sync", status: "ok", entryCount: count });
      return { entryCount: count };
    } finally {
      syncing = false;
    }
  }

  async syncOne(id: string): Promise<void> {
    const source = await repositories.getBlocklistSource(id);
    if (!source) throw new Error("Source not found");
    await this.syncAll();
  }

  getStatus() {
    return {
      syncing,
      lastSyncAt,
      entryCount: this.store.blocklistSize,
    };
  }
}

export async function reloadRules(store: InMemoryStore): Promise<void> {
  const rules = await repositories.listRules();
  store.loadRules(rules);
  eventBus.emit("rules:updated", { type: "rules:updated" });
}
