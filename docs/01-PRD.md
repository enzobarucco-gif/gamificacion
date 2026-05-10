# PRD — PGD User MVP

## 1. Resumen ejecutivo

Plataforma web + mobile (PWA) que conecta **jugadores**, **equipos** y **canchas** para organizar partidos, reservar y pagar turnos y registrar estadísticas validadas entre pares.

**Objetivo de negocio:** retención y liquidez (más partidos completados con stats validadas por mes).

**Diferencial vs CeleBreak / Playtomic:** un único producto extensible a múltiples deportes bajo una misma identidad, perfiles, reputación, pagos y operación. Evita la fragmentación de "una app por deporte".

## 2. Objetivos y métricas

### North Star
Partidos completados con stats validadas / mes.

### Objetivos M1 (lanzamiento del MVP)
| Métrica | Target |
|---|---|
| Tiempo a primera reserva | < 48 h desde signup |
| % partidas con stats cargadas | >= 60% |
| Fill-rate canchas piloto | >= 40% |
| NPS canchas | >= 40 |
| Tasa de disputa | < 5% |

### Secundarias
MAU/WAU, D30, ARPU, GMV.

## 3. Personas y Jobs-to-be-Done

| Persona | JTBD | Éxito |
|---|---|---|
| **Jugador** | Conseguir partido cerca y medir rendimiento | Juega 1+ vez/sem, ve progreso, se mantiene en equipo |
| **Capitán / DT** | Armar partido rápido y confirmar gente | Completa plantel, cierra reserva, evita no-shows |
| **Dueño de cancha** | Llenar agenda y cobrar sin fricción | Ocupación alta, menos cancelaciones, conciliación simple |

## 4. Alcance MVP — épicas y user stories

### Épica: Auth y Perfiles
- Como usuario, quiero registrarme con email/teléfono para acceder a la plataforma.
  - **AC:** registro con verificación, JWT emitido, email + SMS verification working.
- Como jugador, quiero completar posición/pie hábil/disponibilidad para aparecer en búsquedas.
  - **AC:** privacidad por campo (público / semipúblico / privado).

### Épica: Equipos
- Como capitán, quiero crear equipo e invitar miembros.
  - **AC:** invitación, aceptación, roles capitan/dt/jugador, estado pendiente/activo/saliente.

### Épica: Canchas y agenda
- Como usuario, quiero ver catálogo con mapa y filtros (modalidad, precio, distancia, rating, "hoy").
  - **AC:** lista + mapa, ficha con fotos, ratings, política de cancelación, seña requerida.
- Como usuario, quiero ver slots disponibles en tiempo real.
  - **AC:** endpoint devuelve disponibilidad consistente; bloqueo optimista en concurrencia.

### Épica: Reserva y pago
- Como capitán, quiero reservar y pagar seña/saldo.
  - **AC:** checkout MP/Stripe ok, comprobante emitido, expiración de pendiente a 15 min, lock por slot.
- Como capitán, quiero split del pago entre jugadores.
  - **AC:** cada jugador paga su parte; reserva se confirma cuando llega al monto requerido o vence.

### Épica: Partidos y stats
- Como capitán, quiero crear partido (vs otro equipo o pick-up).
  - **AC:** partido vinculado a slot reservado.
- Como jugador, quiero cargar goles, asistencias, atajadas, minutos, rating, notas.
  - **AC:** estado "pendiente validación rival".
- Como capitán, quiero validar resultado y stats del partido.
  - **AC:** transición a `validado` o `disputa`. Disputa abre bitácora.

### Épica: Dashboards
- Como jugador, quiero un dashboard con próximos partidos, rendimiento 30d, radar de habilidades, heat de actividad y badges.
  - **AC:** widgets reordenables (drag & drop), persistencia de layout por usuario.
- Como dueño de cancha, quiero un dashboard con ocupación, ingresos por franja, próximas reservas y reseñas.
  - **AC:** export CSV/Excel de reservas e ingresos.

### Épica: Comunidad
- Como integrante de equipo o partido, quiero un chat para coordinar.
  - **AC:** mensajes persistentes por scope (equipo / partido), reporte de abuso simple, mute/bloqueo.

### Épica: Reseñas
- Como jugador, quiero reseñar canchas (1–5 + comentario).
  - **AC:** solo se puede reseñar si efectivamente jugaste ahí. Cooldown + rate limit.

### Épica: Privacidad y consentimientos
- Como usuario, quiero controlar qué información mía es pública.
  - **AC:** consentimientos por marketing/analytics; centro de preferencias.

### Épica: Admin de cancha
- Como dueño de cancha, quiero dar de alta sede/campos, configurar agenda, precios por franja y políticas (cancelación, seña).
  - **AC:** CRUD completo + reportes simples.

## 5. Requisitos no funcionales

| Atributo | Requisito |
|---|---|
| Performance | p95 lectura < 500 ms; p95 creación de reserva < 900 ms; LCP < 2.5 s |
| Concurrencia | Bloqueo optimista en `agenda_slot`; unicidad de reserva por slot garantizada |
| Disponibilidad | >= 99.5% en M1 |
| Escalabilidad | Colas (Redis) para webhooks pagos y notificaciones; caché de slots |
| Seguridad | OWASP ASVS nivel 1; TLS; secretos en vault; backups diarios |
| Compatibilidad | PWA con offline básico (vistas de partido y tickets de pago) |
| Accesibilidad | WCAG AA+, soporte screen readers |

## 6. Flujos de error y disputas

- **Pago rechazado:** mantener reserva `pendiente` 15 min; reintento u otro medio; liberar slot al expirar.
- **Discrepancia de stats:** estado `disputa`; notifica a ambos capitanes; cierre manual por organizador (si existe) o por consenso.
- **No-show:** estado `no_presentado`; afecta rating del jugador y del equipo.

## 7. Monetización (MVP)

- **Take-rate por reserva** (configurable) con split a la cancha.
- **Plan Pro Jugador / Equipo** (stats avanzadas, historial extendido) — post-MVP.
- **Plan Cancha** (multi-sede, reportes avanzados, API calendario) — post-MVP.
- **Publicidad limitada y segmentada** (opt-in) — V2.

> ⚠️ **Decisión abierta:** cómo aplicar el take-rate cuando el pago es en efectivo en cancha. Resolver en discovery con dueños.

## 8. Plan de lanzamiento

- **Piloto:** 5–10 canchas en 2 zonas de Buenos Aires; 50 equipos.
- **Liquidez:** promos en horarios valle, referidos 2-lados, convenios con ligas locales.
- **Feature flags:** Stripe vs MP, chat, reseñas, drag&drop widgets.
- **Soporte:** centro de ayuda + WhatsApp Business.

## 9. Dependencias y riesgos

| Dependencia / Riesgo | Mitigación |
|---|---|
| Integración MP / Stripe | POC temprano en sprint 1 |
| Verificación SMS | Twilio o equivalente desde day 1 |
| No-shows altos | Seña obligatoria configurable por cancha |
| Baja calidad de datos en stats | Validación cruzada + reputación |
| Fraude en reseñas | Solo si jugaste + cooldown + rate limit |
| Concurrencia en slots | Bloqueo optimista + transacciones |

## 10. Checklist Release Candidate

- [ ] Reserva end-to-end con pago y comprobante
- [ ] Validación de stats entre equipos
- [ ] Dashboards funcionales con widgets persistentes
- [ ] Exports CSV/Excel para canchas
- [ ] Alertas y tableros de observabilidad activos
- [ ] OWASP ASVS L1 verificado
- [ ] Política de privacidad y términos publicados
- [ ] Backups automáticos verificados
