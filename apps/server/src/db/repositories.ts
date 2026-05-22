import { ObjectId } from "mongodb";
import type { Settings, BlocklistSource, Rule, QueryLog, Device, StatsHourly } from "@mydns/shared";
import { DEFAULT_SETTINGS, DEFAULT_BLOCKLIST_SOURCES } from "@mydns/shared";
import { getDb } from "./client.js";

export interface DbUser {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

async function ensureIndexes(): Promise<void> {
  const db = getDb();
  await db.collection("query_logs").createIndexes([
    { key: { timestamp: -1 } },
    { key: { domain: 1, timestamp: -1 } },
    { key: { clientIp: 1, timestamp: -1 } },
    { key: { action: 1, timestamp: -1 } },
  ]);
  await db.collection("devices").createIndex({ ip: 1 }, { unique: true });
  await db.collection("stats_hourly").createIndex({ hour: -1 }, { unique: true });
  await db.collection("rules").createIndexes([{ key: { enabled: 1 } }, { key: { type: 1 } }]);
}

export async function initDb(): Promise<void> {
  await ensureIndexes();
}

function settingsCol() {
  return getDb().collection("settings");
}

export const repositories = {
  async getSettings(): Promise<Settings> {
    const doc = await settingsCol().findOne({ _id: "global" as unknown as ObjectId });
    if (!doc) {
      const now = new Date();
      const settings: Settings = { ...DEFAULT_SETTINGS, updatedAt: now.toISOString() };
      await settingsCol().insertOne({ ...settings, updatedAt: now } as Record<string, unknown>);
      return settings;
    }
    const updatedAt = (doc as Record<string, unknown>).updatedAt;
    return {
      ...(doc as unknown as Settings),
      updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt),
    };
  },

  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const now = new Date();
    await settingsCol().updateOne(
      { _id: "global" as unknown as ObjectId },
      { $set: { ...partial, updatedAt: now } },
      { upsert: true },
    );
    return this.getSettings();
  },

  async listBlocklistSources(): Promise<BlocklistSource[]> {
    const docs = await getDb().collection("blocklist_sources").find({}).sort({ name: 1 }).toArray();
    return docs.map((d) => mapBlocklistSource(d as never));
  },

  async getBlocklistSource(id: string): Promise<BlocklistSource | null> {
    const doc = await getDb().collection("blocklist_sources").findOne({ _id: new ObjectId(id) });
    return doc ? mapBlocklistSource(doc as never) : null;
  },

  async createBlocklistSource(
    data: Omit<BlocklistSource, "_id" | "lastSyncAt" | "lastSyncStatus" | "entryCount">,
  ): Promise<BlocklistSource> {
    const doc = { ...data, lastSyncAt: null, lastSyncStatus: "pending" as const, entryCount: 0 };
    const result = await getDb().collection("blocklist_sources").insertOne(doc);
    return mapBlocklistSource({ ...doc, _id: result.insertedId });
  },

  async updateBlocklistSource(id: string, partial: Partial<BlocklistSource>): Promise<BlocklistSource | null> {
    const { _id, ...rest } = partial;
    void _id;
    await getDb().collection("blocklist_sources").updateOne({ _id: new ObjectId(id) }, { $set: rest });
    return this.getBlocklistSource(id);
  },

  async deleteBlocklistSource(id: string): Promise<boolean> {
    const result = await getDb().collection("blocklist_sources").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  async listRules(type?: "allow" | "deny"): Promise<Rule[]> {
    const filter = type ? { type } : {};
    const docs = await getDb().collection("rules").find(filter).sort({ priority: -1, createdAt: -1 }).toArray();
    return docs.map((d) => mapRule(d as never));
  },

  async createRule(data: Omit<Rule, "_id" | "createdAt">): Promise<Rule> {
    const now = new Date();
    const doc = { ...data, createdAt: now };
    const result = await getDb().collection("rules").insertOne(doc);
    return mapRule({ ...doc, _id: result.insertedId });
  },

  async updateRule(id: string, partial: Partial<Rule>): Promise<Rule | null> {
    const { _id, createdAt, ...rest } = partial;
    void _id;
    void createdAt;
    await getDb().collection("rules").updateOne({ _id: new ObjectId(id) }, { $set: rest });
    const doc = await getDb().collection("rules").findOne({ _id: new ObjectId(id) });
    return doc ? mapRule(doc as never) : null;
  },

  async deleteRule(id: string): Promise<boolean> {
    const result = await getDb().collection("rules").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },

  async insertQueryLogs(logs: Array<Omit<QueryLog, "_id">>): Promise<void> {
    if (logs.length === 0) return;
    const docs = logs.map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp),
      deviceId: log.deviceId ? new ObjectId(log.deviceId) : null,
    }));
    await getDb().collection("query_logs").insertMany(docs, { ordered: false });
  },

  async queryLogs(filters: {
    page: number;
    limit: number;
    action?: string;
    domain?: string;
    clientIp?: string;
    from?: string;
    to?: string;
  }): Promise<{ items: QueryLog[]; total: number }> {
    const query = buildQueryLogFilter(filters);
    const col = getDb().collection("query_logs");
    const total = await col.countDocuments(query);
    const docs = await col
      .find(query)
      .sort({ timestamp: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .toArray();
    return { items: docs.map((d) => mapQueryLog(d as never)), total };
  },

  async exportQueryLogs(filters: {
    action?: string;
    domain?: string;
    clientIp?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<QueryLog[]> {
    const query = buildQueryLogFilter(filters);
    const docs = await getDb()
      .collection("query_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit ?? 10000)
      .toArray();
    return docs.map((d) => mapQueryLog(d as never));
  },

  async deleteAllQueryLogs(): Promise<number> {
    const result = await getDb().collection("query_logs").deleteMany({});
    return result.deletedCount;
  },

  async upsertDevice(ip: string, blocked: boolean): Promise<Device> {
    const col = getDb().collection("devices");
    const now = new Date();
    const result = await col.findOneAndUpdate(
      { ip },
      {
        $set: { lastSeen: now },
        $setOnInsert: {
          ip,
          mac: null,
          hostname: null,
          alias: null,
          firstSeen: now,
          tags: [],
        },
        $inc: { queryCount: 1, ...(blocked ? { blockedCount: 1 } : {}) },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error(`upsertDevice failed for ${ip}`);
    return mapDevice(result as never);
  },

  async syncDevicesFromLogs(): Promise<number> {
    const rows = await getDb()
      .collection("query_logs")
      .aggregate<{
        _id: string;
        queryCount: number;
        blockedCount: number;
        firstSeen: Date;
        lastSeen: Date;
      }>([
        {
          $group: {
            _id: "$clientIp",
            queryCount: { $sum: 1 },
            blockedCount: { $sum: { $cond: [{ $eq: ["$action", "blocked"] }, 1, 0] } },
            firstSeen: { $min: "$timestamp" },
            lastSeen: { $max: "$timestamp" },
          },
        },
      ])
      .toArray();

    if (rows.length === 0) return 0;

    const col = getDb().collection("devices");
    await col.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { ip: row._id },
          update: {
            $setOnInsert: {
              ip: row._id,
              mac: null,
              hostname: null,
              alias: null,
              tags: [],
            },
            $max: { lastSeen: row.lastSeen, queryCount: row.queryCount, blockedCount: row.blockedCount },
            $min: { firstSeen: row.firstSeen },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    return rows.length;
  },

  async listDevices(): Promise<Device[]> {
    const docs = await getDb().collection("devices").find({}).sort({ lastSeen: -1 }).toArray();
    return docs.map((d) => mapDevice(d as never));
  },

  async updateDevice(id: string, partial: Partial<Device>): Promise<Device | null> {
    const { _id, firstSeen, lastSeen, ip, queryCount, blockedCount, ...rest } = partial;
    void _id;
    void firstSeen;
    void lastSeen;
    void ip;
    void queryCount;
    void blockedCount;
    await getDb().collection("devices").updateOne({ _id: new ObjectId(id) }, { $set: rest });
    const doc = await getDb().collection("devices").findOne({ _id: new ObjectId(id) });
    return doc ? mapDevice(doc as never) : null;
  },

  async getDevice(id: string): Promise<Device | null> {
    const doc = await getDb().collection("devices").findOne({ _id: new ObjectId(id) });
    return doc ? mapDevice(doc as never) : null;
  },

  async getStatsOverview(since: Date): Promise<{ total: number; blocked: number; clients: number }> {
    const col = getDb().collection("query_logs");
    const [total, blocked, clients] = await Promise.all([
      col.countDocuments({ timestamp: { $gte: since } }),
      col.countDocuments({ timestamp: { $gte: since }, action: "blocked" }),
      col.distinct("clientIp", { timestamp: { $gte: since } }),
    ]);
    return { total, blocked, clients: clients.length };
  },

  async getTimeline(since: Date): Promise<Array<{ hour: Date; total: number; blocked: number }>> {
    return getDb()
      .collection("query_logs")
      .aggregate<{ _id: Date; total: number; blocked: number }>([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$timestamp", unit: "hour" } },
            total: { $sum: 1 },
            blocked: { $sum: { $cond: [{ $eq: ["$action", "blocked"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray()
      .then((rows) => rows.map((r) => ({ hour: r._id, total: r.total, blocked: r.blocked })));
  },

  async getTopDomains(since: Date, limit: number): Promise<Array<{ domain: string; count: number }>> {
    return getDb()
      .collection("query_logs")
      .aggregate<{ _id: string; count: number }>([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: "$domain", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray()
      .then((rows) => rows.map((r) => ({ domain: r._id, count: r.count })));
  },

  async getTopBlocked(since: Date, limit: number): Promise<Array<{ domain: string; count: number }>> {
    return getDb()
      .collection("query_logs")
      .aggregate<{ _id: string; count: number }>([
        { $match: { timestamp: { $gte: since }, action: "blocked" } },
        { $group: { _id: "$domain", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray()
      .then((rows) => rows.map((r) => ({ domain: r._id, count: r.count })));
  },

  async getTopClients(since: Date, limit: number): Promise<Array<{ ip: string; count: number }>> {
    return getDb()
      .collection("query_logs")
      .aggregate<{ _id: string; count: number }>([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: "$clientIp", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray()
      .then((rows) => rows.map((r) => ({ ip: r._id, count: r.count })));
  },

  async upsertStatsHourly(hour: Date, data: Omit<StatsHourly, "_id" | "hour">): Promise<void> {
    await getDb().collection("stats_hourly").updateOne({ hour }, { $set: { ...data, hour } }, { upsert: true });
  },

  async ensureDefaultBlocklists(): Promise<void> {
    const col = getDb().collection("blocklist_sources");
    const count = await col.countDocuments();
    if (count === 0) {
      for (const source of DEFAULT_BLOCKLIST_SOURCES) {
        await col.insertOne({ ...source, lastSyncAt: null, lastSyncStatus: "pending", entryCount: 0 });
      }
    }
  },

  async getUser(username: string): Promise<DbUser | null> {
    return getDb().collection<DbUser>("users").findOne({ username });
  },

  async createUser(username: string, passwordHash: string): Promise<DbUser> {
    const doc: DbUser = { _id: new ObjectId(), username, passwordHash, createdAt: new Date() };
    await getDb().collection("users").insertOne(doc);
    return doc;
  },

  async updateUserPassword(username: string, passwordHash: string): Promise<void> {
    await getDb().collection("users").updateOne({ username }, { $set: { passwordHash } });
  },

  async ensureTtlIndex(retentionDays: number): Promise<void> {
    const col = getDb().collection("query_logs");
    const indexes = await col.indexes();
    const ttlIndex = indexes.find((i) => i.key?.timestamp === 1 && i.expireAfterSeconds);
    if (ttlIndex?.name) await col.dropIndex(ttlIndex.name);
    await col.createIndex({ timestamp: 1 }, { expireAfterSeconds: retentionDays * 86400 });
  },
};

function buildQueryLogFilter(filters: {
  action?: string;
  domain?: string;
  clientIp?: string;
  from?: string;
  to?: string;
}): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.action) query.action = filters.action;
  if (filters.domain) query.domain = { $regex: filters.domain, $options: "i" };
  if (filters.clientIp) query.clientIp = filters.clientIp;
  if (filters.from || filters.to) {
    query.timestamp = {};
    if (filters.from) (query.timestamp as Record<string, Date>).$gte = new Date(filters.from);
    if (filters.to) (query.timestamp as Record<string, Date>).$lte = new Date(filters.to);
  }
  return query;
}

function mapBlocklistSource(doc: Record<string, unknown>): BlocklistSource {
  const lastSyncAt = doc.lastSyncAt;
  return {
    ...(doc as unknown as BlocklistSource),
    _id: String(doc._id),
    lastSyncAt: lastSyncAt instanceof Date ? lastSyncAt.toISOString() : (lastSyncAt as string | null) ?? null,
  };
}

function mapRule(doc: Record<string, unknown>): Rule {
  return {
    ...(doc as unknown as Rule),
    _id: String(doc._id),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

function mapQueryLog(doc: Record<string, unknown>): QueryLog {
  const deviceId = doc.deviceId;
  return {
    ...(doc as unknown as QueryLog),
    _id: String(doc._id),
    timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : String(doc.timestamp),
    deviceId: deviceId ? String(deviceId) : null,
  };
}

function mapDevice(doc: Record<string, unknown>): Device {
  return {
    ...(doc as unknown as Device),
    _id: String(doc._id),
    firstSeen: doc.firstSeen instanceof Date ? doc.firstSeen.toISOString() : String(doc.firstSeen),
    lastSeen: doc.lastSeen instanceof Date ? doc.lastSeen.toISOString() : String(doc.lastSeen),
  };
}
