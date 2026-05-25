import * as dgram from "node:dgram";
import * as dnsPacket from "dns-packet";
import type { Settings } from "@mydns/shared";

const QUERY_TIMEOUT_MS = 3000;

export async function resolveUpstream(
  query: Buffer,
  upstreams: string[],
): Promise<{ response: Buffer; upstream: string; ttl: number } | null> {
  for (const upstream of upstreams) {
    try {
      const result = await queryUpstream(query, upstream);
      if (result) return { ...result, upstream };
    } catch {
      continue;
    }
  }
  return null;
}

function queryUpstream(query: Buffer, upstream: string): Promise<{ response: Buffer; ttl: number } | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, QUERY_TIMEOUT_MS);

    socket.on("message", (msg) => {
      clearTimeout(timer);
      socket.close();
      const ttl = extractMinTtl(msg);
      resolve({ response: Buffer.from(msg), ttl });
    });

    socket.on("error", () => {
      clearTimeout(timer);
      socket.close();
      resolve(null);
    });

    socket.send(query, 53, upstream, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    });
  });
}

function extractMinTtl(response: Buffer): number {
  try {
    const parsed = dnsPacket.decode(response);
    let minTtl = 300;
    for (const answer of parsed.answers ?? []) {
      if ("ttl" in answer && typeof answer.ttl === "number") {
        minTtl = Math.min(minTtl, answer.ttl);
      }
    }
    return minTtl;
  } catch {
    return 300;
  }
}

export function buildBlockedResponse(
  query: Buffer,
  settings: Settings,
): Buffer {
  const parsed = dnsPacket.decode(query);
  const qname = parsed.questions?.[0]?.name ?? "unknown";
  const qtype = parsed.questions?.[0]?.type ?? "A";

  if (settings.blockResponse === "nxdomain") {
    return dnsPacket.encode({
      id: parsed.id,
      type: "response",
      flags: dnsPacket.RECURSION_AVAILABLE | 3,
      questions: parsed.questions,
    });
  }

  const answers: dnsPacket.Answer[] = [];
  if (qtype === "A") {
    answers.push({ name: qname, type: "A", class: "IN", ttl: 60, data: "0.0.0.0" });
  } else if (qtype === "AAAA") {
    answers.push({ name: qname, type: "AAAA", class: "IN", ttl: 60, data: "::" });
  }

  return dnsPacket.encode({
    id: parsed.id,
    type: "response",
    flags: dnsPacket.RECURSION_AVAILABLE,
    questions: parsed.questions,
    answers,
  });
}

export function buildRefusedResponse(query: Buffer): Buffer {
  const parsed = dnsPacket.decode(query);
  return dnsPacket.encode({
    id: parsed.id,
    type: "response",
    flags: dnsPacket.RECURSION_AVAILABLE | 5,
    questions: parsed.questions,
  });
}

export function getQueryInfo(query: Buffer): { domain: string; qtype: number } | null {
  try {
    const parsed = dnsPacket.decode(query);
    const question = parsed.questions?.[0];
    if (!question) return null;
    const typeMap: Record<string, number> = { A: 1, AAAA: 28, CNAME: 5, MX: 15, TXT: 16 };
    return {
      domain: question.name,
      qtype: typeMap[String(question.type)] ?? 1,
    };
  } catch {
    return null;
  }
}
