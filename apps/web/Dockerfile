# Build context: repo root (docker build -f apps/web/Dockerfile .)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json        ./packages/db/
COPY packages/shared/package.json    ./packages/shared/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/web/package.json           ./apps/web/
RUN pnpm install --frozen-lockfile --filter @pgd/web...

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/packages/ui/node_modules    ./packages/ui/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Variables públicas necesarias en build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @pgd/web run build

# ── runner: Next.js standalone ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S pgd && adduser -S pgd -G pgd

COPY --from=builder --chown=pgd:pgd /app/apps/web/.next/standalone ./
COPY --from=builder --chown=pgd:pgd /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=pgd:pgd /app/apps/web/public           ./apps/web/public

USER pgd
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
