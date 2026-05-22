import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const updateSettingsSchema = z.object({
  upstreams: z.array(z.string()).min(1).optional(),
  blockResponse: z.enum(["nxdomain", "null_ip"]).optional(),
  cacheMaxEntries: z.number().int().min(100).max(100000).optional(),
  cacheMinTtl: z.number().int().min(0).optional(),
  cacheMaxTtl: z.number().int().min(60).optional(),
  logRetentionDays: z.number().int().min(1).max(365).optional(),
  logBlockedOnly: z.boolean().optional(),
  rateLimitPerIp: z.number().int().min(10).max(1000).optional(),
});

export const createRuleSchema = z.object({
  type: z.enum(["allow", "deny"]),
  pattern: z.string().min(1).max(253),
  patternType: z.enum(["exact", "wildcard", "regex"]).default("exact"),
  comment: z.string().max(500).nullable().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
});

export const updateRuleSchema = createRuleSchema.partial();

export const createBlocklistSourceSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  format: z.enum(["hosts", "domains", "adblock"]).default("domains"),
  schedule: z.enum(["daily", "weekly", "manual"]).default("daily"),
});

export const updateBlocklistSourceSchema = createBlocklistSourceSchema.partial();

export const updateDeviceSchema = z.object({
  alias: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export const queryFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  action: z.enum(["allowed", "blocked", "cached"]).optional(),
  domain: z.string().optional(),
  clientIp: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type CreateBlocklistSourceInput = z.infer<typeof createBlocklistSourceSchema>;
export type UpdateBlocklistSourceInput = z.infer<typeof updateBlocklistSourceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type QueryFiltersInput = z.infer<typeof queryFiltersSchema>;
