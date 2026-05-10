# Prompt inicial para Claude Code — Setup del proyecto

> Pegá este prompt en Claude Code (VS Code) **después** de haber clonado/creado el repo con los archivos de este paquete (CLAUDE.md, README.md, /docs, /prompts).

---

## Prompt

```
Hola Atlas. Vamos a inicializar el proyecto PGD (Plataforma de Gestión Deportiva).

Antes de tocar nada, leé estos archivos en orden y confirmame que entendiste:

1. CLAUDE.md (contexto maestro)
2. docs/01-PRD.md
3. docs/02-ARCHITECTURE.md
4. docs/03-DATA_MODEL.md
5. docs/04-API_SPEC.md
6. docs/07-ROADMAP.md

Cuando termines, devolveme:
A) Un resumen de 5–8 bullets de lo que entendiste del proyecto (foco: qué construimos, para quién, qué NO está en MVP, decisiones abiertas).
B) Un plan de implementación para el SPRINT 1 con tareas concretas y orden de ejecución. Sprint 1 cubre:
   - Setup del monorepo (pnpm workspaces + Turborepo)
   - docker-compose con PostgreSQL 16 + PostGIS + Redis 7
   - Inicializar apps/web (Next.js 14 App Router + Tailwind + shadcn/ui)
   - Inicializar apps/api (NestJS 10 + Prisma)
   - Inicializar packages/shared (Zod schemas + tipos compartidos)
   - Inicializar packages/ui (componentes base con tokens)
   - Inicializar packages/db (Prisma schema + primera migration con TODO el schema de docs/03)
   - Setup de CI básico en GitHub Actions (lint + typecheck + test)
   - Scripts npm/pnpm de los comandos frecuentes que están en CLAUDE.md sección 9
   - Seeds mínimas (5 usuarios, 1 owner, 2 canchas, slots para 14 días, 1 equipo, 1 partido)

NO escribas código todavía. Quiero el plan primero. Esperá mi OK.

Restricciones:
- TypeScript estricto en todo
- Identificadores en inglés, comentarios de negocio en español
- Conventional commits
- Tests obligatorios en módulos de pago, RBAC y validación de stats
- Nada de hardcodear secretos
- Schema completo de docs/03-DATA_MODEL.md desde la primera migration
```

---

## Después de aprobar el plan

Vas siguiendo con prompts del estilo:

```
OK. Ejecutá la tarea 1 (setup del monorepo). 
Cuando termines:
- Mostrame los archivos creados
- Corré los comandos de verificación que correspondan
- Resumí qué falta para cerrar la tarea
```

## Tips para mantener Claude Code productivo

1. **Una tarea a la vez.** Si le pedís "hacé todo el sprint" se pierde. Tarea por tarea.
2. **Pedí siempre tests** en cada feature crítica (pagos, RBAC, validación).
3. **Hacele leer el módulo afectado** antes de modificarlo: "leé apps/api/src/auth antes de tocar nada".
4. **Validalo con comandos.** "Corré pnpm typecheck y mostrame el output" es mejor que "te quedó bien?".
5. **Actualizá los docs en el mismo PR.** Si cambia el schema, exigí que actualice docs/03-DATA_MODEL.md.
6. **Feature flags ON por default en dev, OFF en prod.** Siempre.
7. **Cuando se desvíe del CLAUDE.md, traelo de vuelta:** "estás violando la regla X de CLAUDE.md, releela y rehacelo".

## Sprints sugeridos (referencia rápida)

| Sprint | Objetivo |
|---|---|
| 1 | Setup monorepo + DB + skeletons |
| 2 | Auth completo (registro, login, verificación, RBAC) |
| 3 | Equipos + perfiles |
| 4 | Canchas + agenda (admin + público) |
| 5 | Reserva + integración MP (POC) |
| 6 | Reserva + integración Stripe + cancelación |
| 7 | Partidos + carga de stats |
| 8 | Validación + dashboards (jugador y cancha) |
| 9 | Chat + reseñas + privacidad |
| 10 | Reportes + observabilidad + hardening + RC |
