import type { Settings } from "@mydns/shared";

export interface AppConfig {
  mongodbUri: string;
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  dnsPort: number;
  dnsBind: string;
  httpPort: number;
  dataDir: string;
  nodeEnv: string;
}

export function loadConfig(): AppConfig {
  return {
    mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/mydns",
    adminUsername: process.env.ADMIN_USERNAME ?? "admin",
    adminPassword: process.env.ADMIN_PASSWORD ?? "changeme",
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    dnsPort: Number(process.env.DNS_PORT ?? 5353),
    dnsBind: process.env.DNS_BIND ?? "0.0.0.0",
    httpPort: Number(process.env.HTTP_PORT ?? 3000),
    dataDir: process.env.DATA_DIR ?? "./data",
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}

export type RuntimeSettings = Settings;
