import type { QueryLog } from "@mydns/shared";
import { repositories } from "../db/repositories.js";

class LogQueue {
  private queue: Array<Omit<QueryLog, "_id">> = [];
  private flushing = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  push(log: Omit<QueryLog, "_id">): void {
    this.queue.push(log);
    if (this.queue.length >= 200) void this.flush();
  }

  start(): void {
    this.interval = setInterval(() => void this.flush(), 2000);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, 500);
    try {
      await repositories.insertQueryLogs(batch);
    } catch (err) {
      console.error("[log-writer] Failed to flush:", err);
      this.queue.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }
}

export const logQueue = new LogQueue();

export function startLogWriter(): void {
  logQueue.start();
}

export async function stopLogWriter(): Promise<void> {
  logQueue.stop();
  await logQueue.flush();
}
