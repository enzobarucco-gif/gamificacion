# PGD — Plataforma de Gestión Deportiva

> Este archivo es el contexto maestro para Claude Code. Léelo siempre antes de tocar código. Las specs detalladas están en `/docs/`.

---

## 1. Qué estamos construyendo

PGD es una plataforma única y extensible para deporte amateur, con dos segmentos de mercado que comparten un core de infraestructura común (identidad, pagos, notificaciones, RBAC):

- **PGD User** (B2C / B2B2C): marketplace para jugadores, capitanes y dueños de canchas. MVP enfocado en futsal / fútbol amateur (F5/F6/F7) en Argentina. Resuelve el ciclo: Descubrir → Reservar → Pagar (seña/split) → Jugar → Cargar/validar stats → Reseñar.
- **PGD Insti** (B2B SaaS): herramienta para clubes amateurs y tecnificaciones. Reemplaza WhatsApp/Excel con planteles, asistencias, cuotas, torneos y comunicaciones. Validación pendiente (entrevistas con admins de club antes de construir).

**Principio arquitectónico clave:** un único core compartido, no dos apps separadas. Esto habilita el flywheel a futuro (clubes Insti que cargan jugadores pre-onboarded al ecosistema User).

**Prioridad de ejecución:** User MVP primero. Insti queda como track paralelo, gateado por validación.

**North Star Metric:** partidos completados con stats validadas / mes.

---

## 2. Stack técnico (decidido)

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend Web | Next.js 14 (App Router, TS) + PWA | SSR/ISR; PWA para offline básico |
| UI | Tailwind CSS + Radix UI / shadcn-ui | Tokens en `packages/ui` |
| Charts | Recharts | Radar, barras apiladas, línea rolling-5 |
| Mobile | React Native (post-MVP) | Solo si web/PWA no alcanza |
| Backend | NestJS 10 (Node, TS) | REST + Webhooks |
| ORM | Prisma | Schema declarativo, migrations versionadas |
| DB | PostgreSQL 16 + PostGIS | Geo-search de canchas |
| Cache / Colas | Redis 7 + BullMQ | Webhooks pagos, notificaciones |
| Auth | JWT + refresh tokens | OAuth, email, teléfono (SMS) |
| Pagos | Mercado Pago (AR) + Stripe (intl) | Webhooks firmados |
| Infra | GCP o AWS | IaC con Terraform |
| Observabilidad | OpenTelemetry + Sentry + pino | Trazas + logs estructurados |
| CI/CD | GitHub Actions | Feature flags vía Unleash self-hosted |

**Versiones base:** Node 20 LTS, pnpm 9, PostgreSQL 16, Redis 7.

---

## 3. Estructura del monorepo

Usamos pnpm workspaces + Turborepo (más liviano que Nx para este tamaño).

```
pgd/
├── CLAUDE.md                  # este archivo
├── README.md
├── package.json               # workspaces
├── pnpm-workspace.yaml
├── turbo.json
├── docs/                      # specs (no se importa desde código)
├── prompts/                   # prompts iniciales
├── apps/
│   ├── web/                   # Next.js — UI jugador / capitán / cancha-admin
│   └── api/                   # NestJS — REST + webhooks
├── packages/
│   ├── shared/                # tipos, schemas Zod, contratos API compartidos
│   ├── ui/                    # design system: tokens, componentes base
│   └── db/                    # Prisma schema, migrations, seed
└── infra/
    ├── terraform/
    └── docker/                # docker-compose para dev local (postgres, redis)
```

**Regla:** todo tipo o schema compartido entre `web` y `api` vive en `packages/shared`. Si hay duplicación, refactorizar.

---

## 4. Convenciones de código

### General
- TypeScript estricto en todo (`"strict": true`, `"noUncheckedIndexedAccess": true`).
- Comentarios y docs: español si describen producto/negocio; inglés si describen tecnología/algoritmos. Identificadores siempre en inglés.
- Conventional Commits (`feat:`, `fix:`, `chore:`) en inglés.
- Branches: `main`, `develop`, `feat/<scope>-<desc>`, `fix/<scope>-<desc>`.

### Backend (NestJS)
- Estructura modular por dominio: `auth/`, `users/`, `players/`, `teams/`, `venues/`, `bookings/`, `matches/`, `payments/`, `chats/`, `reviews/`.
- Por módulo: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`, `entities/`.
- Validación: class-validator + class-transformer en DTOs. Schemas compartidos con Zod en `packages/shared`.
- DB: Prisma. Migrations versionadas.
- Errores: filtros globales de excepciones; nunca devolver stack al cliente.
- Auth: guards de NestJS para JWT y RBAC (`@Roles('cancha_admin')`).

### Frontend (Next.js)
- App Router. Server Components por defecto; Client Components solo cuando hace falta interactividad.
- Estado server: TanStack Query. Estado UI local: Zustand cuando excede `useState`.
- Forms: React Hook Form + Zod (mismos schemas que el backend vía `packages/shared`).
- Estilos: Tailwind, sin CSS-in-JS. Componentes base de `packages/ui`.
- Accesibilidad AA+: `aria-label`, foco visible, tamaños táctiles >=44px, textos clave >=14px.

### Testing
- Backend: Jest unit por servicio + e2e por flujo crítico (reserva+pago, validación, RBAC).
- Frontend: Vitest + React Testing Library; Playwright para flujos E2E.
- Cobertura mínima: 70% en módulos de pago, RBAC y validación de stats. Resto, sentido común.

### Seguridad (no opcional)
- Nunca loguear PII, tokens, claves de pago.
- Secretos en variables de entorno + vault (Doppler / AWS Secrets Manager). Jamás hardcodear.
- Rate limiting en signup, login, creación de reserva, carga de stats.
- reCAPTCHA en signup público.
- Webhooks de pagos: verificar firma siempre.
- OWASP ASVS nivel 1 como baseline.

---

## 5. Modelo de datos (resumen — full en `docs/data-model.md`)

Entidades núcleo del MVP:

```
usuario ─1:1─ jugador
usuario ─1:N─ role_assignment (rol + scope)
equipo ─1:N─ equipo_miembro ─N:1─ jugador
cancha ─1:N─ campo ─1:N─ agenda_slot
partido ─1:1─ reserva ─N:1─ agenda_slot
partido ─1:N─ partido_equipo ─N:1─ equipo
partido ─1:N─ participacion (stats por jugador)
reserva ─1:N─ pago
resena, disputa, consentimiento, audit_log
```

**Roles:** `jugador`, `capitan`, `cancha_admin`, `super_admin`. RBAC por rol + scope (scope = `equipo_id` o `cancha_id`).

**Estados clave:**
- `agenda_slot.estado`: libre | reservado | bloqueado
- `reserva.estado`: pendiente | pagada | cancelada | no_presentado
- `partido.estado_validacion`: pendiente | parcial | validado | disputa
- `pago.estado`: iniciado | aprobado | rechazado | reversado

---

## 6. API REST (resumen — full en `docs/api-spec.md`)

Base: `/api/v1`. JSON. Auth: `Bearer <jwt>` + refresh.

Recursos principales:
- `/auth/*` — register, login, verify, refresh
- `/me` — perfil propio
- `/players/:id`, `/teams`, `/teams/:id/members`
- `/venues`, `/venues/:id`, `/fields/:id/slots`
- `/bookings` — crear / cancelar
- `/matches`, `/matches/:id/stats`, `/matches/:id/validate`, `/matches/:id/disputes`
- `/payments/checkout`
- `/webhooks/mercado_pago`, `/webhooks/stripe`
- `/chats/:scope`, `/reviews`

Códigos: 200, 201, 400, 401, 403, 404, **409 (conflicto de validación)**, 422, 500.

---

## 7. Decisiones abiertas (resolver en discovery)

1. **Pagos en efectivo en cancha**: cómo aplica el take-rate. Opciones: (a) split solo digital, cash queda fuera; (b) cash se "marca" en la app y se cobra fee fijo a la cancha; (c) seña digital obligatoria + saldo libre. *Pendiente entrevistas con dueños.*
2. **Insti**: arquitectura multi-tenant — cada club como tenant aislado o sub-org dentro del core. Decidir al validar.
3. **Geo**: PostGIS desde day 1 vs lat/lng simple. **Decidido: PostGIS desde el inicio** porque reescribir cuesta caro.

---

## 8. Workflow para Claude Code

1. Antes de escribir código nuevo: leer el spec correspondiente en `/docs/` y el módulo afectado.
2. Antes de cambiar el modelo de datos: actualizar `docs/data-model.md` y la migration de Prisma en el mismo PR.
3. Antes de cambiar la API: actualizar `docs/api-spec.md` y los tipos en `packages/shared` en el mismo PR.
4. Tests: PR sin tests para flujos de pago, RBAC o validación de stats no se mergea. Punto.
5. Feature flags: features nuevas que toquen pagos, chat o validación van detrás de flag. Default off en producción.

---

## 9. Comandos frecuentes

```bash
# instalación
pnpm install

# levantar dev local (postgres + redis vía docker)
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev          # arranca web + api en paralelo

# tests
pnpm test         # unit (Jest + Vitest)
pnpm test:e2e     # Playwright

# build
pnpm build

# DB
pnpm db:migrate:create -- <nombre>
pnpm db:reset
```

---

## 10. Roadmap resumido (full en `docs/roadmap.md`)

- **M1 (8–10 sem):** Core reservas/pagos + stats/validación + dashboards básicos. **MVP User.**
- **M2:** Matchmaking, ELO/MMR, torneos básicos, reportes avanzados cancha.
- **M3:** Otros deportes, video highlights, sensores/IA opt-in, marketplace, módulo Insti.

**Criterio de release del MVP:** reserva end-to-end con pago + comprobante, validación de stats entre equipos, dashboards con widgets persistentes, exports CSV para canchas, observabilidad activa.

---

## 11. Documentos de referencia

| Si vas a... | Leé primero |
|---|---|
| Implementar una feature | `docs/roadmap.md` |
| Tocar la base de datos | `docs/data-model.md` |
| Crear o modificar un endpoint | `docs/api-spec.md` |
| Pensar UI/UX | `docs/design-system.md` + `prompts/02-DESIGN_BRIEF.md` |
| Configurar tracking | `docs/tracking.md` |
| Decisiones arquitectónicas | `docs/architecture.md` |
| Onboarding al producto | `docs/prd.md` |
| Arrancar Sprint 1 | `prompts/01-SETUP.md` |

---

## 12. Product Owner

Enzo Barucco — fundador y PM. Contador, base Buenos Aires.
Decisiones de producto: él. Decisiones técnicas: discusión abierta, decisión final del PO.
