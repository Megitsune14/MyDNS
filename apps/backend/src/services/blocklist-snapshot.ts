import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface Snapshot {
  domains: string[];
  savedAt: string;
}

export async function saveBlocklistSnapshot(dataDir: string, domains: Iterable<string>): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const snapshot: Snapshot = {
    domains: [...domains],
    savedAt: new Date().toISOString(),
  };
  await writeFile(join(dataDir, "blocklist-snapshot.json"), JSON.stringify(snapshot), "utf-8");
}

export async function loadBlocklistSnapshot(dataDir: string): Promise<string[] | null> {
  try {
    const raw = await readFile(join(dataDir, "blocklist-snapshot.json"), "utf-8");
    const snapshot = JSON.parse(raw) as Snapshot;
    return snapshot.domains ?? null;
  } catch {
    return null;
  }
}
