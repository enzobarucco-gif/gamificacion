# API Spec

**Base URL:** `/api/v1`
**Formato:** JSON
**Auth:** `Authorization: Bearer <jwt>` + endpoint `/auth/refresh` para refresh tokens.
**Versionado:** prefijo de URL (`/v1`, `/v2`).

## Convenciones

- **Códigos de respuesta:** 200, 201, 204, 400 (validación), 401 (auth), 403 (RBAC), 404, **409 (conflicto: slot ya reservado, validación contradictoria)**, 422 (schema), 429 (rate limit), 500.
- **Paginación:** `?page=1&limit=20`, response incluye `{ items: [], page, limit, total }`.
- **Errores:** body `{ error: { code: string, message: string, details?: any } }`.
- **Idempotencia:** endpoints de creación crítica (reserva, pago) aceptan header `Idempotency-Key`.
- **Rate limits:** 100 req/min por IP en endpoints públicos, 600 req/min autenticado.

## 1. Auth y usuarios

| Método | Path | Descripción | Body | Resp |
|---|---|---|---|---|
| POST | `/auth/register` | Alta usuario | `{email, password, nombre, telefono?}` | `{user, tokens}` |
| POST | `/auth/login` | Login | `{email, password}` | `{user, tokens}` |
| POST | `/auth/refresh` | Refresh token | `{refresh_token}` | `{tokens}` |
| POST | `/auth/logout` | Invalidar refresh | `{refresh_token}` | 204 |
| POST | `/auth/email/verify` | Verificar email | `{token}` | `{status}` |
| POST | `/auth/phone/verify` | Verificar SMS | `{phone, code}` | `{status}` |
| POST | `/auth/password/forgot` | Solicitar reset | `{email}` | 204 |
| POST | `/auth/password/reset` | Reset con token | `{token, new_password}` | 204 |
| GET | `/me` | Perfil actual | – | `{user, roles}` |
| PATCH | `/me` | Editar perfil | `{nombre?, telefono?, ...}` | `{user}` |
| DELETE | `/me` | Eliminar cuenta (soft) | – | 204 |

## 2. Jugadores y equipos

| Método | Path | Descripción | Body | Resp |
|---|---|---|---|---|
| GET | `/players/:id` | Ver jugador | – | `{player}` |
| PATCH | `/players/:id` | Editar perfil jugador | `{posicion?, pie_habil?, ...}` | `{player}` |
| GET | `/players/search` | Buscar jugadores | `?q&posicion&zona` | `{items[], paging}` |
| GET | `/teams` | Listar mis equipos | – | `{items[]}` |
| POST | `/teams` | Crear equipo | `{nombre, avatar?}` | `{team}` |
| GET | `/teams/:id` | Detalle equipo | – | `{team, members[]}` |
| PATCH | `/teams/:id` | Editar equipo | `{nombre?, avatar?}` | `{team}` |
| POST | `/teams/:id/invite` | Invitar jugador | `{jugador_id}` | `{status}` |
| POST | `/teams/:id/join` | Solicitar unirse | – | `{status}` |
| PATCH | `/teams/:id/members/:jid` | Cambiar rol/estado | `{rol?, estado?}` | `{member}` |
| DELETE | `/teams/:id/members/:jid` | Sacar miembro | – | 204 |

## 3. Canchas, agenda y reservas

| Método | Path | Descripción | Body / Query | Resp |
|---|---|---|---|---|
| GET | `/venues` | Buscar canchas | `?lat&lng&radius&modalidad&precio_max&rating_min&disponibilidad=hoy` | `{items[], paging}` |
| GET | `/venues/:id` | Detalle cancha | – | `{cancha, campos[], reseñas[]}` |
| POST | `/venues` | Crear cancha (admin) | `{nombre, lat, lng, ...}` | `{cancha}` |
| PATCH | `/venues/:id` | Editar | `{...}` | `{cancha}` |
| GET | `/fields/:id/slots` | Ver slots | `?from&to` | `{slots[]}` |
| POST | `/fields/:id/slots/bulk` | Crear slots en lote (admin) | `{from, to, duracion, precio}` | `{count}` |
| PATCH | `/slots/:id/block` | Bloquear slot (admin) | `{motivo?}` | `{slot}` |
| POST | `/bookings` | Crear reserva (lock + checkout init) | `{slot_id, partido_id?, sena_cents?}` | `{reserva, checkout_url}` |
| GET | `/bookings/:id` | Ver reserva | – | `{reserva, pagos[]}` |
| PATCH | `/bookings/:id/cancel` | Cancelar | `{motivo}` | `{reserva}` |
| GET | `/bookings/me` | Mis reservas | – | `{items[]}` |

**Flujo crítico de reserva:**

1. Cliente: `POST /bookings` → API valida slot libre + crea reserva `pendiente` con `expires_at = now + 15min` + crea registro `pago` `iniciado` + devuelve `checkout_url`.
2. Cliente paga en MP/Stripe.
3. MP/Stripe → `POST /webhooks/...` → API valida firma + actualiza `pago.estado = aprobado` + `reserva.estado = pagada` + `agenda_slot.estado = reservado`.
4. Si pasan 15 min sin pago: worker libera el slot (`reserva.estado = cancelada`, `slot.estado = libre`).

## 4. Partidos, stats y validación

| Método | Path | Descripción | Body | Resp |
|---|---|---|---|---|
| POST | `/matches` | Crear partido | `{equipo_a_id?, equipo_b_id?, modalidad, fecha, campo_id?, tipo: 'vs'|'pickup'}` | `{partido}` |
| GET | `/matches/:id` | Ver partido | – | `{partido, equipos, stats}` |
| GET | `/matches/me` | Mis partidos | `?from&to&estado` | `{items[]}` |
| POST | `/matches/:id/stats` | Cargar stats | `{participaciones: [{jugador_id, goles, asistencias, ...}]}` | `{status}` |
| POST | `/matches/:id/validate` | Validar resultado | `{ok: boolean, observaciones?}` | `{partido}` |
| POST | `/matches/:id/disputes` | Abrir disputa | `{motivo}` | `{disputa}` |
| PATCH | `/disputes/:id/close` | Cerrar disputa (admin/super_admin) | `{resolucion}` | `{disputa}` |

**Flujo de validación:** ambos capitanes (o un capitán + organizador en pickup) deben validar. Si discrepan en stats → estado `disputa` automático.

## 5. Pagos y webhooks

| Método | Path | Descripción | Body | Resp |
|---|---|---|---|---|
| POST | `/payments/checkout` | Iniciar checkout (alt al embed en `/bookings`) | `{reserva_id, proveedor}` | `{checkout_url, ext_payment_id}` |
| POST | `/payments/split` | Iniciar split entre jugadores | `{reserva_id, splits: [{usuario_id, monto_cents}]}` | `{checkouts[]}` |
| GET | `/payments/:id` | Ver pago | – | `{pago}` |
| POST | `/webhooks/mercado_pago` | Webhook MP | `raw` | `{ok}` |
| POST | `/webhooks/stripe` | Webhook Stripe | `raw` | `{ok}` |

**Webhooks:** verificación de firma obligatoria (HMAC). Idempotencia por `ext_payment_id`. Reintentos con BullMQ + backoff.

## 6. Comunidad (chat) y reseñas

| Método | Path | Descripción | Body | Resp |
|---|---|---|---|---|
| GET | `/chats/:scope_tipo/:scope_id` | Ver chat | `?before&limit` | `{messages[]}` |
| POST | `/chats/:scope_tipo/:scope_id` | Enviar mensaje | `{texto}` | `{message}` |
| POST | `/chats/messages/:id/report` | Reportar abuso | `{motivo}` | 204 |
| POST | `/reviews` | Crear reseña | `{tipo_objeto, objeto_id, puntaje, comentario}` | `{resena}` |
| GET | `/reviews` | Listar reseñas | `?tipo_objeto&objeto_id` | `{items[], paging}` |

## 7. Admin de cancha (dashboards y reportes)

| Método | Path | Descripción | Body / Query | Resp |
|---|---|---|---|---|
| GET | `/venues/:id/dashboard` | KPIs cancha | `?from&to` | `{ocupacion, ingresos, proximas_reservas[], nps}` |
| GET | `/venues/:id/reports/bookings` | Export reservas | `?from&to&format=csv|xlsx` | file |
| GET | `/venues/:id/reports/revenue` | Export ingresos | `?from&to&format=csv|xlsx` | file |

## 8. RBAC matriz (resumen)

| Endpoint | jugador | capitan | cancha_admin | super_admin |
|---|---|---|---|---|
| `/me`, `/players/:self` | ✅ | ✅ | ✅ | ✅ |
| `/teams` (crear) | ✅ | ✅ | ✅ | ✅ |
| `/teams/:id` (editar) | ❌ | ✅ (su equipo) | – | ✅ |
| `/venues` (crear) | ❌ | ❌ | ✅ | ✅ |
| `/venues/:id` (editar) | ❌ | ❌ | ✅ (own) | ✅ |
| `/bookings` | ✅ | ✅ | ❌ | ✅ |
| `/matches/:id/validate` | ❌ | ✅ (su equipo) | ❌ | ✅ |
| `/disputes/:id/close` | ❌ | ❌ | ❌ | ✅ |
| `/venues/:id/dashboard` | ❌ | ❌ | ✅ (own) | ✅ |

## 9. OpenAPI

El backend debe exponer `/api/v1/docs` con Swagger UI generado automáticamente desde decoradores NestJS (`@nestjs/swagger`). Ese es el contrato canónico; este markdown es la guía humana.
