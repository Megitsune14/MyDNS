import { repositories } from "../db/repositories.js";

const pending = new Set<Promise<void>>();

export const deviceTracker = {
  track(ip: string, blocked: boolean): void {
    const promise = repositories
      .upsertDevice(ip, blocked)
      .then(() => undefined)
      .catch((err) => console.error("[device-tracker]", err))
      .finally(() => pending.delete(promise));
    pending.add(promise);
  },

  async flush(): Promise<void> {
    await Promise.all(pending.values());
  },
};
