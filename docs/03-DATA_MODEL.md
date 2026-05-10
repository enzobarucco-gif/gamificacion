# Modelo de Datos

## ERD (alto nivel)

```
usuario ─1:1─ jugador
usuario ─1:N─ role_assignment (rol + scope_id)
usuario ─1:N─ consentimiento

equipo ─1:N─ equipo_miembro ─N:1─ jugador
equipo ─*:1─ jugador (capitan)

cancha ─1:N─ campo
campo  ─1:N─ agenda_slot
cancha ─1:N─ resena
cancha ─*:1─ usuario (owner)

partido ─1:1─ reserva
partido ─1:N─ partido_equipo ─N:1─ equipo
partido ─1:N─ participacion (PK compuesta partido_id + jugador_id)
partido ─1:N─ disputa

reserva ─N:1─ agenda_slot
reserva ─N:1─ cancha
reserva ─1:N─ pago

audit_log (genérico)
```

## Convenciones

- **PKs:** UUID v4, generadas por DB (`gen_random_uuid()`).
- **Timestamps:** `timestamptz` siempre, en UTC.
- **Dinero:** entero en centavos (`int` o `bigint` según escala). Nunca floats.
- **Soft delete:** `deleted_at timestamptz` en tablas con datos relevantes (no en `agenda_slot` ni `participacion`).
- **JSONB:** solo para campos genuinamente schemaless (políticas, disponibilidad). Prefiere columnas tipadas.

## Schema SQL completo

```sql
-- ============================================================
-- Extensiones
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Usuarios y roles
-- ============================================================
CREATE TABLE usuario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  telefono          TEXT,
  hash_password     TEXT,
  nombre            TEXT NOT NULL,
  verificado_email  BOOLEAN DEFAULT FALSE,
  verificado_tel    BOOLEAN DEFAULT FALSE,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_usuario_email ON usuario(email) WHERE deleted_at IS NULL;

CREATE TYPE rol_sistema AS ENUM ('jugador', 'capitan', 'cancha_admin', 'super_admin');

CREATE TABLE role_assignment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol         rol_sistema NOT NULL,
  scope_id    UUID,                                  -- equipo_id o cancha_id
  created_at  timestamptz DEFAULT now(),
  UNIQUE (usuario_id, rol, scope_id)
);

CREATE INDEX idx_role_user ON role_assignment(usuario_id);

-- ============================================================
-- Jugador (extiende usuario)
-- ============================================================
CREATE TABLE jugador (
  id              UUID PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  posicion        TEXT,
  pie_habil       TEXT,
  fecha_nac       DATE,
  estatura_cm     INT,
  disponibilidad  JSONB DEFAULT '{}',
  foto_url        TEXT,
  privacidad      TEXT DEFAULT 'publico'
                  CHECK (privacidad IN ('publico', 'semipublico', 'privado')),
  rating_actual   NUMERIC(3,2) DEFAULT 0
);

-- ============================================================
-- Equipos
-- ============================================================
CREATE TABLE equipo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  capitan_id  UUID REFERENCES jugador(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  created_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TYPE estado_miembro AS ENUM ('pendiente', 'activo', 'saliente');
CREATE TYPE rol_en_equipo AS ENUM ('jugador', 'capitan', 'dt');

CREATE TABLE equipo_miembro (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id   UUID NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
  jugador_id  UUID NOT NULL REFERENCES jugador(id) ON DELETE CASCADE,
  rol         rol_en_equipo DEFAULT 'jugador',
  estado      estado_miembro DEFAULT 'activo',
  joined_at   timestamptz DEFAULT now(),
  UNIQUE (equipo_id, jugador_id)
);

CREATE INDEX idx_em_jugador ON equipo_miembro(jugador_id);
CREATE INDEX idx_em_equipo ON equipo_miembro(equipo_id);

-- ============================================================
-- Canchas y agenda
-- ============================================================
CREATE TABLE cancha (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  ubicacion_name  TEXT,
  geom            GEOGRAPHY(POINT, 4326),  -- PostGIS para distancia real
  politicas       JSONB DEFAULT '{}',      -- cancelacion, sena_pct, etc
  rating          NUMERIC(3,2) DEFAULT 0,
  owner_id        UUID REFERENCES usuario(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_cancha_geom ON cancha USING GIST (geom);
CREATE INDEX idx_cancha_owner ON cancha(owner_id);

CREATE TYPE modalidad AS ENUM ('F5', 'F6', 'F7', 'FUTSAL');

CREATE TABLE campo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id         UUID NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  nombre            TEXT,
  modalidad         modalidad NOT NULL,
  precio_base_cents INT NOT NULL,
  duracion_min      INT NOT NULL DEFAULT 60
);

CREATE INDEX idx_campo_cancha ON campo(cancha_id);

CREATE TYPE estado_slot AS ENUM ('libre', 'reservado', 'bloqueado');

CREATE TABLE agenda_slot (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id      UUID NOT NULL REFERENCES campo(id) ON DELETE CASCADE,
  inicio        timestamptz NOT NULL,
  fin           timestamptz NOT NULL,
  estado        estado_slot DEFAULT 'libre',
  precio_cents  INT,
  version       INT DEFAULT 0,             -- bloqueo optimista
  UNIQUE (campo_id, inicio)
);

CREATE INDEX idx_slot_campo_inicio ON agenda_slot(campo_id, inicio, estado);
CREATE INDEX idx_slot_inicio ON agenda_slot(inicio) WHERE estado = 'libre';

-- ============================================================
-- Partidos
-- ============================================================
CREATE TYPE estado_partido AS ENUM ('programado', 'jugado', 'cancelado');
CREATE TYPE estado_validacion AS ENUM ('pendiente', 'parcial', 'validado', 'disputa');

CREATE TABLE partido (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id           UUID REFERENCES cancha(id) ON DELETE SET NULL,
  campo_id            UUID REFERENCES campo(id) ON DELETE SET NULL,
  fecha               timestamptz NOT NULL,
  modalidad           modalidad NOT NULL,
  estado              estado_partido DEFAULT 'programado',
  estado_validacion   estado_validacion DEFAULT 'pendiente',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_partido_fecha ON partido(fecha, estado);

CREATE TABLE partido_equipo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id  UUID NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
  equipo_id   UUID REFERENCES equipo(id) ON DELETE SET NULL,
  es_local    BOOLEAN,
  goles       INT DEFAULT 0,
  UNIQUE (partido_id, es_local)
);

-- ============================================================
-- Reservas
-- ============================================================
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'pagada', 'cancelada', 'no_presentado');

CREATE TABLE reserva (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id       UUID REFERENCES cancha(id) ON DELETE SET NULL,
  partido_id      UUID UNIQUE REFERENCES partido(id) ON DELETE CASCADE,
  slot_id         UUID UNIQUE REFERENCES agenda_slot(id) ON DELETE SET NULL,
  estado          estado_reserva DEFAULT 'pendiente',
  importe_cents   INT NOT NULL,
  sena_cents      INT DEFAULT 0,
  fees_cents      INT DEFAULT 0,
  expires_at      timestamptz,                -- cuando vence si queda pendiente
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_reserva_estado ON reserva(estado);
CREATE INDEX idx_reserva_expires ON reserva(expires_at) WHERE estado = 'pendiente';

-- ============================================================
-- Stats por jugador (PK compuesta)
-- ============================================================
CREATE TABLE participacion (
  partido_id    UUID REFERENCES partido(id) ON DELETE CASCADE,
  jugador_id    UUID REFERENCES jugador(id) ON DELETE CASCADE,
  minutos       INT DEFAULT 0,
  goles         INT DEFAULT 0,
  asistencias   INT DEFAULT 0,
  atajadas      INT DEFAULT 0,
  calificacion  INT CHECK (calificacion BETWEEN 1 AND 10),
  notas         TEXT,
  cargado_por   UUID REFERENCES usuario(id),
  validado_por  UUID REFERENCES usuario(id),
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (partido_id, jugador_id)
);

-- ============================================================
-- Reseñas
-- ============================================================
CREATE TABLE resena (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id      UUID REFERENCES usuario(id) ON DELETE SET NULL,
  tipo_objeto   TEXT NOT NULL CHECK (tipo_objeto IN ('cancha', 'partido')),
  objeto_id     UUID NOT NULL,
  puntaje       INT CHECK (puntaje BETWEEN 1 AND 5),
  comentario    TEXT,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_resena_objeto ON resena(tipo_objeto, objeto_id);

-- ============================================================
-- Pagos
-- ============================================================
CREATE TYPE estado_pago AS ENUM ('iniciado', 'aprobado', 'rechazado', 'reversado');
CREATE TYPE proveedor_pago AS ENUM ('mercado_pago', 'stripe');

CREATE TABLE pago (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id      UUID NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
  proveedor       proveedor_pago NOT NULL,
  ext_payment_id  TEXT UNIQUE,                  -- idempotencia
  estado          estado_pago DEFAULT 'iniciado',
  monto_cents     INT NOT NULL,
  moneda          TEXT DEFAULT 'ARS',
  split_json      JSONB,
  pagador_id      UUID REFERENCES usuario(id),  -- en split, quién pagó esta porción
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_pago_ext ON pago(ext_payment_id);
CREATE INDEX idx_pago_reserva ON pago(reserva_id);

-- ============================================================
-- Disputas
-- ============================================================
CREATE TYPE estado_disputa AS ENUM ('abierta', 'en_revision', 'cerrada');

CREATE TABLE disputa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id  UUID NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
  motivo      TEXT,
  estado      estado_disputa DEFAULT 'abierta',
  abierta_por UUID REFERENCES usuario(id),
  cerrada_por UUID REFERENCES usuario(id),
  resolucion  TEXT,
  created_at  timestamptz DEFAULT now(),
  closed_at   timestamptz
);

-- ============================================================
-- Audit log y consentimientos
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES usuario(id) ON DELETE SET NULL,
  objeto      TEXT NOT NULL,
  objeto_id   UUID,
  accion      TEXT NOT NULL,                 -- create, update, delete, validate, dispute
  cambio      JSONB,
  ip          INET,
  user_agent  TEXT,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_objeto ON audit_log(objeto, objeto_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at DESC);

CREATE TABLE consentimiento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,                 -- marketing, analytics, privacidad
  estado      BOOLEAN NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (usuario_id, tipo)
);

-- ============================================================
-- Chat (simple, en MVP)
-- ============================================================
CREATE TABLE chat_mensaje (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_tipo  TEXT NOT NULL CHECK (scope_tipo IN ('equipo', 'partido')),
  scope_id    UUID NOT NULL,
  autor_id    UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_scope ON chat_mensaje(scope_tipo, scope_id, created_at DESC);
```

## Seeds mínimas (para desarrollo)

- 5 usuarios (jugadores)
- 1 dueño de cancha
- 2 canchas con 3 campos cada una (1 F5, 1 F7, 1 FUTSAL)
- Slots para los próximos 14 días en horarios típicos (18-23 hs)
- 1 equipo de prueba con 8 miembros
- 1 partido programado para mañana

## Nota sobre Prisma

El archivo `packages/db/prisma/schema.prisma` debe reflejar este SQL. Cuando haya conflicto entre el SQL acá y el `schema.prisma`, **gana el schema.prisma + migration**. Este doc se actualiza después.

Para PostGIS: usar `Unsupported("geography(POINT,4326)")` en Prisma y queries raw para geo (no hay soporte nativo).
