FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

# package-lock généré sous Windows omet les binaires natifs Linux (rollup, lightningcss)
RUN rm -f package-lock.json \
    && npm install \
    && npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/frontend/dist ./apps/frontend/dist

EXPOSE 53/udp 53/tcp 3000

CMD ["node", "apps/backend/dist/index.js"]
