# Build context: repo root (docker build -f apps/api/Dockerfile .)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── deps: instala solo lo necesario para @pgd/api y sus workspaces ────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json        ./packages/db/
COPY packages/shared/package.json    ./packages/shared/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/api/package.json           ./apps/api/
RUN pnpm install --frozen-lockfile --filter @pgd/api...

# ── builder: compila TypeScript + genera Prisma client ────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/packages/db/node_modules    ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @pgd/db run generate
RUN pnpm --filter @pgd/api run build

# ── runner: imagen mínima de producción ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S pgd && adduser -S pgd -G pgd

# Solo artefactos necesarios en runtime
COPY --from=builder --chown=pgd:pgd /app/apps/api/dist        ./dist
COPY --from=builder --chown=pgd:pgd /app/node_modules          ./node_modules
COPY --from=builder --chown=pgd:pgd /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder --chown=pgd:pgd /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder --chown=pgd:pgd /app/apps/api/node_modules ./apps/api/node_modules
# Prisma schema necesario para migrations en runtime
COPY --from=builder --chown=pgd:pgd /app/packages/db/prisma   ./packages/db/prisma

USER pgd
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
