# MyDNS — TODO List (Roadmap)

## Phase 0 — Fondations ✅

- [x] Monorepo npm workspaces (`packages/shared`, `apps/server`, `apps/web`)
- [x] Docker Compose + Dockerfile
- [x] Config env (`.env.example`)
- [x] Package `@mydns/shared` (types + schémas Zod)
- [x] Skeleton Hono + MongoDB + graceful shutdown
- [x] Shell React (thème `components.md`, AppShell, auth)

## Phase 1 — MVP DNS ✅

- [x] DNS UDP/TCP handler (A, AAAA)
- [x] Upstream forwarding plain DNS
- [x] Cache mémoire TTL (LRU + clamp min/max)
- [x] Blocklist hosts/domains en mémoire (Set)
- [x] Règles allow/deny (exact + wildcard + regex)
- [x] Log queue → MongoDB (batch async)
- [x] Réponse block `0.0.0.0` / NXDOMAIN
- [x] Rate limiting par IP client

## Phase 2 — Admin complet ✅

- [x] CRUD blocklist sources + sync
- [x] CRUD rules whitelist/blacklist
- [x] WebSocket flux live (`/ws/live`) + auth token
- [x] Stats rollup worker (5 min)
- [x] Page appareils + détail appareil
- [x] Settings (upstreams, retention, cache, mot de passe)
- [x] Dashboard + requêtes + statistiques + graphiques Recharts
- [x] Purge logs + export CSV

## Phase 3 — Polish ✅

- [x] Rate limiting DNS + API
- [x] Headers sécurité (CSP, X-Frame-Options…)
- [x] TCP DNS length-prefixed
- [x] Virtualisation table requêtes
- [x] Throttle WebSocket (100 evt/s)
- [x] Normalisation IDN/punycode
- [x] Parsing Adblock étendu
- [x] Snapshot blocklist disque (boot rapide)
- [x] Healthcheck Docker mydns
- [x] README documentation
- [x] Build production web + server typecheck

## Phase 4 — Avancé (optionnel, non implémenté)

- [ ] DoH/DoT upstream
- [ ] Support IPv6 complet (bind réseau)
- [ ] Filtrage par appareil (politiques)
- [ ] Bloom filter blocklists
- [ ] Parsing Adblock 100 % complet
- [ ] DNSSEC validation
- [ ] Filtrage CNAME chains
- [ ] EDNS0
- [ ] Tests automatisés DNS/API
- [ ] Notifications webhook (Discord/Telegram)
