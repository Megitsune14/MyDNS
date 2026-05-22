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
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 53/udp 53/tcp 3000

CMD ["node", "apps/server/dist/index.js"]
