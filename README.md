# PGD — Plataforma de Gestión Deportiva

Plataforma única y extensible para deporte amateur. MVP foco en futsal / fútbol amateur (F5/F6/F7) en Argentina.

## Segmentos

- **PGD User** — marketplace para jugadores, capitanes y dueños de canchas (B2C / B2B2C). Prioridad MVP.
- **PGD Insti** — SaaS B2B para clubes amateurs (validación pendiente).

Ambos segmentos comparten un único core de infraestructura.

## North Star

Partidos completados con stats validadas / mes.

## Quick start

```bash
pnpm install
pnpm docker:up
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Web: http://localhost:3000 — API: http://localhost:4000

## Documentación

- **`CLAUDE.md`** — contexto maestro (léelo primero, también lo lee Claude Code automáticamente).
- **`docs/`** — specs detallados:
  - `prd.md` — Product Requirements Document
  - `architecture.md` — arquitectura y ADRs
  - `data-model.md` — ERD + schema SQL completo
  - `api-spec.md` — endpoints REST
  - `design-system.md` — tokens, componentes, patrones UI
  - `tracking.md` — eventos analytics y KPIs
  - `roadmap.md` — fases, backlog, criterios de release
- **`prompts/`** — prompts iniciales:
  - `01-SETUP.md` — primer prompt para Claude Code
  - `02-DESIGN_BRIEF.md` — brief de diseño para UI/UX

## Stack

Next.js (PWA) · NestJS · PostgreSQL + PostGIS · Redis + BullMQ · Mercado Pago / Stripe · Tailwind + Radix · Recharts · Prisma · Turborepo + pnpm.

## Estado

Fase actual: **discovery + setup técnico**. Pendiente:
- Entrevistas con 5–10 dueños de canchas (validar workflow + take-rate efectivo).
- Resolución del flujo de pagos en efectivo + fee model.
- Validación de PGD Insti (post-MVP).
