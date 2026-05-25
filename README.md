# MyDNS

Alternative locale à Pi-hole / AdGuard Home — serveur DNS filtrant self-hosted pour homelab.

## Stack

- **Backend** : Node.js 22 + Hono + moteur DNS intégré (UDP/TCP port 53)
- **Frontend** : React + Vite + Tailwind v4 + shadcn/ui
- **Base de données** : MongoDB
- **Déploiement** : Docker Compose

## Démarrage rapide (développement)

### Prérequis

- [Node.js](https://nodejs.org) ≥ 20 (22 LTS recommandé)
- MongoDB (local ou Docker)

## Production

```bash
cd deploy
docker compose up -d --build
```

Interface : http://localhost:5173  
Identifiants par défaut : `admin` / `changeme`

## Architecture

Monolithe modulaire TypeScript :

- Moteur DNS en mémoire (blocklists, cache, filtrage)
- API REST + WebSocket temps réel
- Logs DNS asynchrones vers MongoDB
- SPA React servie par Hono

## Configuration

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MONGODB_URI` | `mongodb://mongo:27017/mydns` | Connexion MongoDB |
| `ADMIN_USERNAME` | `admin` | Identifiant admin |
| `ADMIN_PASSWORD` | `changeme` | Mot de passe admin |
| `DNS_PORT` | `53` | Port DNS (5353 en dev) |
| `HTTP_PORT` | `3000` | Port interface web |
| `JWT_SECRET` | — | Secret sessions |