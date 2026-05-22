import { repositories } from "../db/repositories.js";
import { eventBus } from "../services/event-bus.js";

let interval: ReturnType<typeof setInterval> | null = null;

export function startStatsRollup(): void {
  interval = setInterval(() => void rollup(), 5 * 60 * 1000);
}

export function stopStatsRollup(): void {
  if (interval) clearInterval(interval);
  interval = null;
}

async function rollup(): Promise<void> {
  try {
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    const since = new Date(hour);

    const [overview, topDomains, topBlocked, topClients] = await Promise.all([
      repositories.getStatsOverview(since),
      repositories.getTopDomains(since, 10),
      repositories.getTopBlocked(since, 10),
      repositories.getTopClients(since, 10),
    ]);

    await repositories.upsertStatsHourly(hour, {
      totalQueries: overview.total,
      blockedQueries: overview.blocked,
      uniqueClients: overview.clients,
      topDomains,
      topBlocked,
      topClients,
    });

    eventBus.emit("stats:tick", {
      type: "stats:tick",
      total: overview.total,
      blocked: overview.blocked,
    });
  } catch (err) {
    console.error("[stats-rollup]", err);
  }
}

export function startBlocklistScheduler(syncFn: () => Promise<void>): void {
  const msUntilNext4am = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(4, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  };

  const schedule = () => {
    setTimeout(async () => {
      try {
        await syncFn();
      } catch (err) {
        console.error("[blocklist-scheduler]", err);
      }
      schedule();
    }, msUntilNext4am());
  };

  schedule();
}
