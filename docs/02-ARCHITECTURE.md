# Arquitectura

## Diagrama de alto nivel

```
                    ┌─────────────────────────────────────┐
                    │         Cliente (Web / PWA)          │
                    │   Next.js · Tailwind · TanStack     │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                                   │
                    ┌──────────────▼──────────────────────┐
                    │            API Gateway              │
                    │   (rate limit · WAF · TLS · CORS)   │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         API NestJS                  │
                    │  Auth · Players · Teams · Venues    │
                    │  Bookings · Matches · Payments      │
                    │  Chats · Reviews · Webhooks         │
                    └──┬───────────┬──────────┬───────────┘
                       │           │          │
              ┌────────▼──┐  ┌─────▼────┐  ┌──▼──────────┐
              │ PostgreSQL │  │  Redis   │  │  Workers    │
              │  + PostGIS │  │ + BullMQ │  │ (BullMQ)    │
              └────────────┘  └──────────┘  └─────────────┘
                                                 │
                       ┌─────────────────────────┼─────────────────────┐
                       │                         │                     │
                ┌──────▼──────┐         ┌────────▼────────┐    ┌───────▼─────┐
                │ Mercado Pago│         │     Stripe      │    │ Twilio (SMS)│
                └─────────────┘         └─────────────────┘    └─────────────┘
```

## Decisiones arquitectónicas (ADRs resumidos)

### ADR-001: Monorepo con Turborepo + pnpm
**Decisión:** monorepo en lugar de polyrepo.
**Razón:** tipos compartidos entre web y api, refactors atómicos, una sola pipeline.
**Trade-off:** acoplamiento mayor. Mitigación: versionar `packages/shared` con changesets.

### ADR-002: NestJS + Prisma para el backend
**Decisión:** NestJS en lugar de Express puro o Fastify; Prisma en lugar de TypeORM.
**Razón:** estructura modular forzada, DI nativa, mejor para equipos. Prisma tiene mejor DX y schema declarativo.
**Trade-off:** más opinionado. OK para este caso.

### ADR-003: Next.js App Router + Server Components por defecto
**Decisión:** App Router (no Pages Router).
**Razón:** estándar actual, mejor streaming, RSC reducen JS al cliente.
**Trade-off:** algunos paquetes aún no son RSC-friendly. Caso por caso.

### ADR-004: PostgreSQL con PostGIS desde day 1
**Decisión:** PostGIS habilitado desde la primera migration.
**Razón:** queries geo (canchas cercanas) son centrales, no opcionales. Reescribir luego cuesta caro.
**Trade-off:** algo más de complejidad operativa. Aceptable.

### ADR-005: Bloqueo optimista en agenda_slot
**Decisión:** versión optimista (`updated_at` o `version`) en slots, no locks pesimistas.
**Razón:** lecturas son muchas, escrituras conflictivas son pocas. Pesimista mata throughput.
**Implementación:** transacciones con `SELECT ... FOR UPDATE` solo en el momento de confirmar la reserva, después de validar disponibilidad.

### ADR-006: Webhooks de pago con cola de reintentos
**Decisión:** todo webhook entra en BullMQ con backoff exponencial (5 reintentos).
**Razón:** los proveedores reintentan; debemos ser idempotentes y resilientes.
**Implementación:** `ext_payment_id` único + `INSERT ON CONFLICT DO NOTHING` para idempotencia.

### ADR-007: RBAC con rol + scope
**Decisión:** un usuario puede tener múltiples `role_assignment` con scope distinto (un equipo, una cancha). No roles globales.
**Razón:** un usuario puede ser jugador en un equipo y capitán en otro, o dueño de varias canchas.
**Implementación:** guard de NestJS que valida `(rol, scope_id)` contra el recurso accedido.

## Capa de dominio

Cada módulo del backend sigue este layout:

```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts        # acceso DB (delegado a Prisma)
├── guards/
│   ├── jwt.guard.ts
│   └── roles.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── dto/
│   ├── register.dto.ts
│   └── login.dto.ts
└── tests/
    ├── auth.service.spec.ts
    └── auth.e2e-spec.ts
```

## Multi-tenancy (preparación para Insti)

Aunque el MVP es single-tenant funcional, el schema **debe** estar listo para multi-tenancy desde el inicio:

- Tabla `organizacion` (futura): clubes Insti.
- Tabla `tenant` (futura): contiene `organizacion_id` + flags de features.
- Toda tabla con datos sensibles (jugadores, equipos, partidos en contexto Insti) llevará `tenant_id` nullable en MVP, NOT NULL cuando Insti se active.
- Row-Level Security (RLS) de Postgres + middleware NestJS que inyecta `tenant_id` en cada query.

**Por ahora:** dejar el campo `tenant_id` previsto en migrations futuras. No agregar todavía para no over-engineer.

## Observabilidad

- **Trazas:** OpenTelemetry → Jaeger / Tempo / Honeycomb.
- **Logs:** estructurados (JSON) con `pino`. Nivel `info` en prod, `debug` en dev.
- **Métricas:** Prometheus → Grafana. Métricas mínimas: latencia p50/p95/p99 por endpoint, error rate, queue depth, DB pool.
- **Errores:** Sentry para frontend y backend.

## Seguridad operativa

- **Secretos:** Doppler o AWS Secrets Manager. Nunca en repo.
- **Backups:** PostgreSQL diario (pg_dump cifrado a S3 / GCS), retención 30 días.
- **Cifrado en reposo:** habilitado a nivel disco (RDS / Cloud SQL).
- **Auditoría:** `audit_log` para cambios sensibles (pagos, validaciones, cambios de rol).

## Despliegue

- **Dev:** docker-compose (postgres, redis, mailhog).
- **Staging:** entorno completo en GCP/AWS, deploys automáticos desde `develop`.
- **Prod:** deploys manuales desde `main` con aprobación. Blue/green o rolling.
- **DB migrations:** corren en pre-deploy step, con dry-run primero.
