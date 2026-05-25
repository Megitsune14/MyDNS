import type { QueryLog } from "@mydns/shared";

export function queryLogsToCsv(logs: QueryLog[]): string {
  const header = "timestamp,clientIp,domain,action,blockReason,responseTimeMs,upstream";
  const rows = logs.map((log) =>
    [
      log.timestamp,
      log.clientIp,
      csvEscape(log.domain),
      log.action,
      csvEscape(log.blockReason ?? ""),
      String(log.responseTimeMs),
      csvEscape(log.upstream ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
