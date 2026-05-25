import bcrypt from "bcryptjs";
import { createMiddleware } from "hono/factory";
import type { AppConfig } from "../../config/index.js";

const encoder = new TextEncoder();

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}

export async function createToken(username: string, secret: string): Promise<string> {
  const payload = JSON.stringify({ username, exp: Date.now() + 7 * 86400000 });
  const sig = await hmacSign(payload, secret);
  return btoa(`${payload}.${sig}`);
}

export async function verifyToken(token: string, secret: string): Promise<{ username: string } | null> {
  try {
    const decoded = atob(token);
    const dotIndex = decoded.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const payload = decoded.slice(0, dotIndex);
    const sig = decoded.slice(dotIndex + 1);
    const valid = await hmacVerify(payload, sig, secret);
    if (!valid) return null;
    const data = JSON.parse(payload) as { username: string; exp: number };
    if (data.exp < Date.now()) return null;
    return { username: data.username };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type AuthVariables = {
  username: string;
};

export function authMiddleware(config: AppConfig) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return c.json({ error: "Non autorisé" }, 401);
    const user = await verifyToken(token, config.jwtSecret);
    if (!user) return c.json({ error: "Token invalide" }, 401);
    c.set("username", user.username);
    await next();
  });
}
