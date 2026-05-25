import type { BlocklistFormat } from "@mydns/shared";
import { normalizeDomain } from "../memory/store.js";

export function parseBlocklist(content: string, format: BlocklistFormat): string[] {
  const lines = content.split(/\r?\n/);
  const domains: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;

    if (format === "hosts") {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) domains.push(parts[1]!);
    } else if (format === "adblock") {
      const domain = parseAdblockLine(trimmed);
      if (domain) domains.push(domain);
    } else {
      domains.push(trimmed);
    }
  }

  return domains.map(normalizeDomain).filter(Boolean);
}

function parseAdblockLine(line: string): string | null {
  // ||domain^
  const pipeMatch = line.match(/^\|\|([^/|^|]+)\^/);
  if (pipeMatch?.[1]) return pipeMatch[1];

  // |http://domain^ or |https://domain^
  const urlMatch = line.match(/^\|https?:\/\/([^/|^|]+)\^/);
  if (urlMatch?.[1]) return urlMatch[1];

  // domain.com$ (domain anchor)
  const anchorMatch = line.match(/^([a-z0-9.*-]+\.[a-z]{2,})\$/i);
  if (anchorMatch?.[1] && !anchorMatch[1].includes("*")) return anchorMatch[1];

  // @@||domain^ exception lines — skip
  if (line.startsWith("@@")) return null;

  return null;
}

export async function fetchBlocklist(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MyDNS/0.1.0" },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}
