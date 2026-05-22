# MyDNS

Alternative moderne à Pi-hole / AdGuard Home — serveur DNS filtrant self-hosted pour homelab.

## Stack

- **Backend** : Node.js 22 + Hono + moteur DNS intégré (UDP/TCP port 53)
- **Frontend** : React + Vite + Tailwind v4 + shadcn/ui
- **Base de données** : MongoDB
- **Déploiement** : Docker Compose

## Démarrage rapide (développement)

### Prérequis

- [Node.js](https://nodejs.org) ≥ 20 (22 LTS recommandé)
- MongoDB (local ou Docker)

```bash
# MongoDB via Docker
docker run -d --name mydns-mongo -p 27017:27017 mongo:7

# Installation
npm install

# Lancer le serveur (DNS sur port 5353 en dev, API sur 3000)
cd apps/server
set MONGODB_URI=mongodb://localhost:27017/mydns
set DNS_PORT=5353
npm run dev

# Dans un autre terminal — frontend
cd apps/web
npm run dev
```

Interface : http://localhost:5173  
Identifiants par défaut : `admin` / `changeme`

## Production (Docker)

```bash
cp .env.example .env
# Éditer ADMIN_PASSWORD et JWT_SECRET

cd docker
docker compose up -d --build
```

Interface : http://\<nas-ip\>:3000  
DNS : pointer le routeur vers \<nas-ip\>:53

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

## QNAP TS-251+

- Utiliser `docker compose` depuis Container Station
- Vérifier qu'aucun service QNAP n'occupe le port 53
- Allouer ~1 Go RAM au conteneur
- Configurer le routeur : DNS primaire = IP du NAS
- **Vraies IP clients** : sur Linux/QNAP, utiliser le mode réseau hôte :
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.host.yml up -d --build
  ```
  Sans cela, Docker masque les IP derrière la passerelle du bridge (ex. `172.18.0.1`).

### Docker Desktop (Windows / macOS)

Avec le mapping de ports classique, MyDNS voit la passerelle Docker (`172.18.0.1`) et non l'IP de chaque appareil. Le filtrage DNS fonctionne, mais la page Appareils regroupe tout sous cette IP. Sur le NAS Linux, préférer `docker-compose.host.yml`.

## Licence

MIT
