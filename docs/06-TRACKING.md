# Tracking & Analytics

## Stack

- **Captura:** Segment (CDP) → GA4 + warehouse.
- **Warehouse:** BigQuery (preferido por costo y stack GCP) o Redshift.
- **Visualización:** Metabase (open source) en M1; Looker Studio para dashboards a stakeholders.
- **Producto:** PostHog para session replay, funnels, retention (opt-in del usuario).

## Identidad

- `user_id` (UUID interno) para usuarios autenticados.
- `anonymous_id` (cookie) para visitantes.
- `identify()` en login y en signup.
- **Contextos siempre presentes:** `team_id`, `venue_id`, `match_id` cuando apliquen.

## Eventos clave

### North Star y activación

| Evento | Cuándo | Props principales |
|---|---|---|
| `Match Completed` | Al cambiar `partido.estado` a `jugado` | `match_id, modalidad, duracion_min, validated, jugadores_count` |
| `Stats Validated` | Al cambiar `partido.estado_validacion` a `validado` | `match_id, equipos_ids[], delta_calificaciones` |
| `First Week Milestone` | Usuario completa 1 partido + 1 reseña en <=7 días | `user_id, day_offset` |
| `Activation Reached` | Hits the AHA criteria | `user_id, days_since_signup` |

### Adquisición y reservas

| Evento | Props |
|---|---|
| `Signup Started` | `method: email|phone|oauth` |
| `Signup Completed` | `user_id, method` |
| `Venue Searched` | `query, filtros, lat, lng, results_count` |
| `Venue Viewed` | `venue_id, source` |
| `Slot Viewed` | `field_id, slot_id, price_cents, availability` |
| `Booking Started` | `reserva_id, provider, sena_cents` |
| `Booking Abandoned` | `reserva_id, step, reason?` |
| `Payment Approved` | `reserva_id, provider, monto_cents, fees_cents, split` |
| `Payment Rejected` | `reserva_id, provider, reason` |
| `Booking Cancelled` | `reserva_id, motivo, time_to_cancel_minutes` |

### Engagement y comunidad

| Evento | Props |
|---|---|
| `Team Created` | `team_id, member_count: 1` |
| `Player Invited` | `team_id, jugador_id, method` |
| `Player Joined Team` | `team_id, jugador_id` |
| `Match Created` | `match_id, type: vs|pickup, modalidad` |
| `Match Joined` | `match_id, user_id` |
| `Stats Loaded` | `match_id, completeness_pct` |
| `Dispute Opened` | `match_id, motivo` |
| `Message Sent` | `scope, scope_id, chars_count` |
| `Review Submitted` | `tipo_objeto, objeto_id, puntaje` |

### Cancha admin

| Evento | Props |
|---|---|
| `Field Schedule Configured` | `field_id, slots_created` |
| `Pricing Updated` | `venue_id, field_id, change_pct` |
| `Report Exported` | `venue_id, type: bookings|revenue, format` |

## KPIs derivados (queries SQL canónicas)

### North Star: partidos validados / mes
```sql
SELECT
  date_trunc('month', validated_at) AS mes,
  COUNT(*) AS partidos_validados
FROM partido
WHERE estado_validacion = 'validado'
GROUP BY 1 ORDER BY 1;
```

### Tiempo a primera reserva
```sql
SELECT
  user_id,
  EXTRACT(EPOCH FROM (first_booking - signup)) / 3600 AS horas
FROM (
  SELECT u.id AS user_id, u.created_at AS signup,
    MIN(r.created_at) AS first_booking
  FROM usuario u
  JOIN reserva r ON r.created_by = u.id
  GROUP BY 1, 2
) x;
```

### Fill-rate por cancha
```sql
SELECT
  c.id, c.nombre,
  SUM(CASE WHEN s.estado = 'reservado' THEN 1 ELSE 0 END)::float /
    NULLIF(COUNT(*), 0) AS fill_rate
FROM cancha c
JOIN campo f ON f.cancha_id = c.id
JOIN agenda_slot s ON s.campo_id = f.id
WHERE s.inicio BETWEEN now() - interval '30 days' AND now()
GROUP BY 1, 2;
```

### D30 retention cohorts
```sql
WITH cohorts AS (
  SELECT id, date_trunc('week', created_at) AS cohort_week FROM usuario
),
activity AS (
  SELECT u.id, date_trunc('week', m.fecha) AS act_week
  FROM usuario u
  JOIN participacion p ON p.jugador_id = u.id
  JOIN partido m ON m.id = p.partido_id
  WHERE m.estado = 'jugado'
)
SELECT
  c.cohort_week,
  EXTRACT(WEEK FROM (a.act_week - c.cohort_week)) AS week_offset,
  COUNT(DISTINCT c.id) AS users
FROM cohorts c LEFT JOIN activity a ON a.id = c.id
GROUP BY 1, 2 ORDER BY 1, 2;
```

## Dashboards target M1

1. **Producto** — North Star mensual, activación, retention D7/D30.
2. **Operaciones** — fill-rate por cancha, ingresos, NPS, tasa de disputa.
3. **Health técnico** — error rate, latencia, queue depth, webhooks fallidos.

## Privacidad

- Consentimiento de analytics es **opt-in** explícito (banner inicial + centro de preferencias).
- Si el usuario revoca: eventos siguen recogidos pero asociados a `anonymous_id` rotado, no a `user_id`.
- No tracking en endpoints de salud, status, o webhooks.
- PII (email, teléfono) **nunca** va a eventos analytics. Solo `user_id`.
