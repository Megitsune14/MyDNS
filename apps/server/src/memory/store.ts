import type { BlockDecision, Rule, Settings } from "@mydns/shared";
import { toASCII } from "node:punycode";

export function normalizeDomain(domain: string): string {
  let d = domain.trim().toLowerCase();
  if (d.endsWith(".")) d = d.slice(0, -1);
  try {
    d = toASCII(d);
  } catch {
    /* domaine invalide, conserver tel quel */
  }
  return d;
}

export function domainVariants(domain: string): string[] {
  const normalized = normalizeDomain(domain);
  const parts = normalized.split(".");
  const variants: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    variants.push(parts.slice(i).join("."));
  }
  return variants.length > 0 ? variants : [normalized];
}

export class RulesIndex {
  private exactAllow = new Set<string>();
  private exactDeny = new Set<string>();
  private wildcardAllow: Array<{ suffix: string }> = [];
  private wildcardDeny: Array<{ suffix: string }> = [];
  private regexAllow: Array<{ pattern: RegExp; raw: string }> = [];
  private regexDeny: Array<{ pattern: RegExp; raw: string }> = [];

  load(rules: Rule[]): void {
    this.exactAllow.clear();
    this.exactDeny.clear();
    this.wildcardAllow = [];
    this.wildcardDeny = [];
    this.regexAllow = [];
    this.regexDeny = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const pattern =
        rule.patternType === "regex" ? rule.pattern.trim() : normalizeDomain(rule.pattern);
      if (rule.patternType === "exact") {
        if (rule.type === "allow") this.exactAllow.add(pattern);
        else this.exactDeny.add(pattern);
      } else if (rule.patternType === "wildcard") {
        const suffix = pattern.startsWith("*.") ? pattern.slice(2) : pattern.replace(/^\*\./, "");
        if (rule.type === "allow") this.wildcardAllow.push({ suffix });
        else this.wildcardDeny.push({ suffix });
      } else if (rule.patternType === "regex") {
        try {
          const re = new RegExp(rule.pattern, "i");
          if (rule.type === "allow") this.regexAllow.push({ pattern: re, raw: rule.pattern });
          else this.regexDeny.push({ pattern: re, raw: rule.pattern });
        } catch {
          /* skip invalid regex */
        }
      }
    }
  }

  check(domain: string): BlockDecision | null {
    const normalized = normalizeDomain(domain);
    const variants = domainVariants(normalized);

    for (const v of variants) {
      if (this.exactAllow.has(v)) return { blocked: false, reason: null };
    }
    for (const { pattern } of this.regexAllow) {
      if (pattern.test(normalized)) return { blocked: false, reason: null };
    }
    for (const { suffix } of this.wildcardAllow) {
      if (normalized === suffix || normalized.endsWith(`.${suffix}`)) {
        return { blocked: false, reason: null };
      }
    }

    for (const v of variants) {
      if (this.exactDeny.has(v)) return { blocked: true, reason: "custom_rule" };
    }
    for (const { pattern } of this.regexDeny) {
      if (pattern.test(normalized)) return { blocked: true, reason: "custom_rule" };
    }
    for (const { suffix } of this.wildcardDeny) {
      if (normalized === suffix || normalized.endsWith(`.${suffix}`)) {
        return { blocked: true, reason: "custom_rule" };
      }
    }

    return null;
  }
}

export class BlocklistIndex {
  private exact = new Set<string>();
  private suffixes = new Set<string>();

  load(domains: Iterable<string>): number {
    this.exact.clear();
    this.suffixes.clear();
    let count = 0;
    for (const raw of domains) {
      const d = normalizeDomain(raw);
      if (!d || d.startsWith("#") || d.includes(" ")) continue;
      if (d.startsWith("*.")) {
        this.suffixes.add(d.slice(2));
      } else {
        this.exact.add(d);
      }
      count++;
    }
    return count;
  }

  isBlocked(domain: string): boolean {
    const normalized = normalizeDomain(domain);
    const variants = domainVariants(normalized);
    for (const v of variants) {
      if (this.exact.has(v)) return true;
    }
    for (const suffix of this.suffixes) {
      if (normalized === suffix || normalized.endsWith(`.${suffix}`)) return true;
    }
    return false;
  }

  get size(): number {
    return this.exact.size + this.suffixes.size;
  }
}

export class InMemoryStore {
  private blocklist = new BlocklistIndex();
  private rules = new RulesIndex();
  settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  loadBlocklist(domains: Iterable<string>): number {
    return this.blocklist.load(domains);
  }

  loadRules(rules: Rule[]): void {
    this.rules.load(rules);
  }

  checkDomain(domain: string): BlockDecision {
    const ruleResult = this.rules.check(domain);
    if (ruleResult) return ruleResult;
    if (this.blocklist.isBlocked(domain)) {
      return { blocked: true, reason: "blocklist" };
    }
    return { blocked: false, reason: null };
  }

  get blocklistSize(): number {
    return this.blocklist.size;
  }
}
