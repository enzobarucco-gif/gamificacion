# Roadmap & Backlog

## Fases

### M1 — MVP User (8–10 semanas)
**Objetivo:** ciclo completo Descubrir → Reservar → Pagar → Jugar → Cargar/validar stats → Reseñar, funcionando end-to-end con 5–10 canchas piloto y 50 equipos.

### M2 — Profundidad y rankings (siguientes 8–10 semanas)
**Objetivo:** matchmaking, rankings ELO/MMR, torneos básicos, reportes avanzados para canchas, exportaciones, integraciones de calendario.

### M3 — Expansión y módulo Insti (resto del año)
**Objetivo:** validación e implementación de PGD Insti (post entrevistas), otros deportes, video highlights manuales, opt-in IA/sensores, marketplace.

## Backlog priorizado MVP

### MUST (M1 — sin esto no hay producto)

| Épica | Ítem | Tamaño | Sprint sugerido |
|---|---|---|---|
| Foundations | Setup monorepo, CI/CD, docker-compose dev | M | 1 |
| Foundations | Schema DB inicial + Prisma + migrations + seeds | M | 1 |
| Auth | Registro / login / verificación email + SMS / JWT | M | 1–2 |
| Auth | RBAC con guards + matriz de permisos | M | 2 |
| Perfiles | CRUD perfil jugador + privacidad por campo | S | 2 |
| Equipos | Crear equipo / invitar / aceptar / roles | M | 2–3 |
| Canchas | CRUD cancha + campos (admin) | M | 3 |
| Canchas | Catálogo público con mapa + filtros (modalidad, precio, distancia) | M | 3–4 |
| Canchas | Ficha de cancha con fotos / ratings / política | S | 4 |
| Agenda | CRUD slots (admin) + bulk creation | M | 4 |
| Agenda | Visualización de disponibilidad en tiempo real | M | 4 |
| Reserva | Crear reserva con lock + expiración 15 min | L | 5 |
| Reserva | Integración MP checkout + webhook + idempotencia | L | 5–6 |
| Reserva | Integración Stripe (paralelo) | M | 6 |
| Reserva | Cancelación según política | S | 6 |
| Partidos | Crear partido (vs / pickup) vinculado a slot | M | 6–7 |
| Partidos | Plantel / confirmaciones | S | 7 |
| Stats | Carga de stats + estado pendiente | M | 7 |
| Stats | Validación cruzada + transición a validado/disputa | M | 7–8 |
| Dashboards | Jugador (próximos, rendimiento, radar, heat, badges) | M | 8 |
| Dashboards | Cancha (ocupación, ingresos, próximas, NPS) | M | 8 |
| Dashboards | Drag & drop persistente | S | 8–9 |
| Comunidad | Chat por equipo y por partido (texto) | S | 9 |
| Comunidad | Reporte de abuso simple + mute | S | 9 |
| Reseñas | Reseñas a canchas + cooldown + rate limit | S | 9 |
| Privacidad | Consentimientos + centro de preferencias | S | 9 |
| Admin Cancha | Reportes simples + export CSV/Excel | M | 10 |
| Observabilidad | OpenTelemetry + Sentry + dashboards Grafana | M | 10 |
| Hardening | OWASP ASVS L1 audit + rate limits + WAF | M | 10 |

### SHOULD (post-MVP inmediato, 2–4 sem)

| Ítem | Tamaño |
|---|---|
| Matchmaking por zona/horario/posición | M |
| Transferencias internas en equipos (alta/baja con trazabilidad) | S |
| Reportes avanzados de cancha (cohortes, comparativas) | M |
| Exportaciones avanzadas (XLSX con formato) | S |
| Notificaciones push (web + PWA) | M |
| Promos de horario valle (CRUD + segmentación simple) | M |
| Referidos 2-lados con tracking | M |
| Onboarding gamificado (checklist AHA) | S |

### COULD (V2 / V3 — Sprint planning a definir según métricas)

| Ítem | Tamaño |
|---|---|
| ELO / MMR + rankings por liga / zona | M |
| Torneos / fixture automático | L |
| Ladders | M |
| Video highlights (subida manual + tags) | M |
| API calendario para integración con dueños de canchas | M |
| Sensores / wearables opt-in | L |
| Marketplace (indumentaria / sponsors) | L |
| Moderación avanzada con KYC | M |
| **PGD Insti** (validación → MVP Insti) | XL |
| Expansión a otros deportes (paddle, vóley, basquet) | XL |

## Criterios de aceptación globales (release MVP)

- [ ] Capitán crea partido, reserva slot, paga seña; miembros notificados; partido en dashboards.
- [ ] Tras el partido, ambos equipos cargan stats y validan; si hay conflicto se abre disputa con notificación.
- [ ] Cancha define precios por franja, ve reportes de ocupación e ingresos, exporta CSV.
- [ ] 5–10 canchas piloto operativas en producción.
- [ ] Cumple OWASP ASVS L1.
- [ ] Observabilidad activa (alertas configuradas).
- [ ] Política de privacidad y T&C publicados.
- [ ] Backups automáticos verificados.

## Validaciones pendientes ANTES de scale-up

1. **Field interviews con dueños de canchas** (5–10 entrevistas) para validar:
   - Workflow actual de reservas (WhatsApp, planilla, sistemas previos).
   - Disposición a cobrar seña digital.
   - **Cómo manejar el pago en efectivo en cancha y el take-rate de la plataforma.**
   - NPS hipotético del producto presentado.
2. **Validación PGD Insti**: 5–10 entrevistas con admins de clubes amateurs antes de comprometer recursos al módulo.
3. **Prototipo Figma o video demo** antes de cada bloque mayor de desarrollo (no construir especulativamente).

## Risks & blockers

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Dueños no aceptan take-rate digital | Media | Alta | Modelo híbrido: seña digital obligatoria + fee fijo, saldo en efectivo libre |
| Adopción lenta del lado jugador (chicken-egg) | Alta | Alta | GTM venue-first: onboardear canchas primero, luego empujar jugadores |
| Costos de SMS verification altos (Twilio) | Baja | Media | Verificación opcional vía email; SMS solo en signups premium o sospechosos |
| Concurrencia en slots populares | Media | Alta | Bloqueo optimista + tests de carga en endpoint de booking |
| Disputas frecuentes de stats | Media | Media | UX clara para validación, organizador opcional como árbitro |
| Costos cloud crecen sin revenue | Media | Alta | Free tier GCP/AWS los primeros 12 meses; alertas de cost |
