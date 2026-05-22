import { createMiddleware } from "hono/factory";

export function securityHeadersMiddleware() {
  return createMiddleware(async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:",
    );
  });
}

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateBucket>();
const API_LIMIT = 120; // req/min

export function apiRateLimitMiddleware() {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "unknown";
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: API_LIMIT, lastRefill: now };
      buckets.set(ip, bucket);
    }
    const elapsed = (now - bucket.lastRefill) / 60000;
    bucket.tokens = Math.min(API_LIMIT, bucket.tokens + elapsed * API_LIMIT);
    bucket.lastRefill = now;
    if (bucket.tokens < 1) return c.json({ error: "Trop de requêtes" }, 429);
    bucket.tokens -= 1;
    await next();
  });
}
