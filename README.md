# PGD — Plataforma de Gestión Deportiva

Marketplace para fútbol amateur en Argentina. Resuelve el ciclo completo: **Descubrir → Reservar → Pagar → Jugar → Stats → Reseñar**.

- **PGD User** (B2C/B2B2C) — jugadores, capitanes, dueños de cancha. **MVP activo.**
- **PGD Insti** (B2B SaaS) — clubes amateurs. Pendiente de validación.

**North Star:** partidos completados con stats validadas / mes.

---

## Setup local (5 minutos)

### Prerequisitos

- Node 20 LTS
- pnpm 9 (`npm install -g pnpm@9`)
- Docker Desktop (para Postgres + Redis + Mailhog)

### 1 — Variables de entorno

```bash
cp .env.example .env
# .env ya viene con valores para dev local, no necesita edición
```

### 2 — Instalar dependencias

```bash
pnpm install
```

### 3 — Levantar servicios de infra

```bash
pnpm docker:up
# Levanta: PostgreSQL 16 + PostGIS, Redis 7, Mailhog (SMTP local)
# Mailhog UI: http://localhost:8025
```

### 4 — Migrar y seedear la base

```bash
pnpm db:migrate   # aplica todas las migrations de Prisma
pnpm db:seed      # carga datos de prueba realistas
```

### 5 — Correr el monorepo

```bash
pnpm dev
# Web:  http://localhost:3000
# API:  http://localhost:3001/api/v1
# Docs: http://localhost:3001/api/v1/docs
```

---

## Usuarios de prueba

El seed crea estos usuarios (contraseña: **`seed1234`**):

| Email | Rol | Descripción |
|---|---|---|
| `superadmin@pgd.dev` | super_admin | Acceso total |
| `cancha@pgd.dev` | cancha_admin | Dueño de 2 canchas |
| `mati@pgd.dev` | capitán | Capitán "Los Pibes del Barrio" |
| `diego@pgd.dev` | capitán | Capitán "Estrellas del Sur" |
| `lucas@pgd.dev` | jugador | Miembro del equipo A |

El seed también crea: 2 canchas con slots para 14 días, 2 partidos (1 jugado con stats validadas, 1 pendiente para mañana) y reseñas.

---

## Comandos frecuentes

```bash
# Dev
pnpm dev                    # web + api en paralelo
pnpm docker:up / :down      # infra local
pnpm docker:logs            # logs de postgres/redis/mailhog

# Base de datos
pnpm db:migrate             # aplica migrations (prisma migrate dev)
pnpm db:seed                # recarga datos de prueba
pnpm db:reset               # reset + re-migra + seed
pnpm db:studio              # Prisma Studio (UI para la DB)
pnpm db:migrate:create -- <nombre>  # nueva migration

# Tests
pnpm test                   # unit tests (Jest + Vitest)
pnpm test:e2e               # E2E (Playwright)

# Build
pnpm build                  # compila todos los workspaces
pnpm typecheck              # tsc --noEmit en todos
pnpm lint                   # ESLint en todos
```

---

## Estructura del monorepo

```
pgd/
├── apps/
│   ├── api/          # NestJS 10 — REST API + webhooks
│   └── web/          # Next.js 14 — App Router + PWA
├── packages/
│   ├── db/           # Prisma schema + migrations + seed
│   ├── shared/       # Tipos y schemas Zod compartidos
│   └── ui/           # Design system: tokens + componentes base
├── infra/
│   ├── docker/       # docker-compose.yml + init-db.sh
│   └── terraform/    # IaC para AWS (ECS Fargate, RDS, Redis, ALB)
└── .github/
    └── workflows/    # CI (typecheck + tests) + CD (build + deploy a ECS)
```

---

## Deploy a producción

### Primera vez — bootstrap de Terraform

```bash
# Crear bucket S3 (state) + DynamoDB (locks) + GitHub OIDC provider
export AWS_PROFILE=tu-perfil
bash infra/terraform/bootstrap.sh sa-east-1 pgd
```

### Apply de infraestructura

```bash
cd infra/terraform
terraform init
terraform plan -var="domain_name=pgd.ar"
terraform apply -var="domain_name=pgd.ar"
# El output `post_apply_steps` indica los pasos manuales restantes
```

### Deploy continuo (automático)

Cada push a `main` dispara el workflow `.github/workflows/deploy.yml`:
1. Build y push de imágenes Docker a ECR
2. `prisma migrate deploy` contra producción
3. `ecs update-service` con circuit breaker y rollback automático

### Secrets requeridos en GitHub Actions

| Secret | Descripción |
|---|---|
| `AWS_ACCOUNT_ID` | ID de cuenta AWS |
| `AWS_DEPLOY_ROLE_ARN` | ARN del rol OIDC (output de Terraform) |
| `NEXT_PUBLIC_API_URL` | URL pública de la API (ej: `https://pgd.ar/api/v1`) |

Los secrets de runtime (JWT, Mercado Pago, Sentry) viven en AWS Secrets Manager bajo `pgd/production/*`.

---

## Arquitectura

```
Browser / PWA
     │ HTTPS
     ▼
  ALB (AWS)
  ├── /api/* → ECS Fargate: NestJS API  ←→ RDS PostgreSQL 16 + PostGIS
  └── /*     → ECS Fargate: Next.js Web ←→ ElastiCache Redis 7
                                              ↕ BullMQ (booking expiry)
                                           Secrets Manager
                                           CloudWatch Logs + Sentry
```

**Región:** `sa-east-1` (São Paulo) para menor latencia desde Argentina.

---

## Documentación

| Si vas a... | Leé primero |
|---|---|
| Entender el producto | `docs/prd.md` |
| Tocar la DB | `docs/data-model.md` |
| Crear/modificar endpoints | `docs/api-spec.md` |
| Trabajar en UI | `docs/design-system.md` |
| Planificar features | `docs/roadmap.md` |
| Decisiones técnicas | `docs/architecture.md` |
| Configurar Claude Code | `CLAUDE.md` |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 · App Router · Tailwind · Radix UI · TanStack Query · Zustand |
| Backend | NestJS 10 · Fastify · Prisma · JWT · BullMQ |
| Base de datos | PostgreSQL 16 + PostGIS · Redis 7 |
| Pagos | Mercado Pago · Stripe (webhooks HMAC verificados) |
| Infra | AWS ECS Fargate · RDS · ElastiCache · ALB · ECR · Terraform |
| CI/CD | GitHub Actions (OIDC, sin long-lived AWS keys) |
| Observabilidad | pino (JSON estructurado) · Sentry · CloudWatch Logs |
