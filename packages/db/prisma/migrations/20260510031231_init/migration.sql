-- CreateEnum
CREATE TYPE "RolSistema" AS ENUM ('jugador', 'capitan', 'cancha_admin', 'super_admin');

-- CreateEnum
CREATE TYPE "EstadoMiembro" AS ENUM ('pendiente', 'activo', 'saliente');

-- CreateEnum
CREATE TYPE "RolEnEquipo" AS ENUM ('jugador', 'capitan', 'dt');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('F5', 'F6', 'F7', 'FUTSAL');

-- CreateEnum
CREATE TYPE "EstadoSlot" AS ENUM ('libre', 'reservado', 'bloqueado');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('programado', 'jugado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('pendiente', 'parcial', 'validado', 'disputa');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('pendiente', 'pagada', 'cancelada', 'no_presentado');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('iniciado', 'aprobado', 'rechazado', 'reversado');

-- CreateEnum
CREATE TYPE "ProveedorPago" AS ENUM ('mercado_pago', 'stripe');

-- CreateEnum
CREATE TYPE "EstadoDisputa" AS ENUM ('abierta', 'en_revision', 'cerrada');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "hash_password" TEXT,
    "nombre" TEXT NOT NULL,
    "verificado_email" BOOLEAN NOT NULL DEFAULT false,
    "verificado_tel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "rol" "RolSistema" NOT NULL,
    "scope_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugador" (
    "id" UUID NOT NULL,
    "posicion" TEXT,
    "pie_habil" TEXT,
    "fecha_nac" DATE,
    "estatura_cm" INTEGER,
    "disponibilidad" JSONB NOT NULL DEFAULT '{}',
    "foto_url" TEXT,
    "privacidad" TEXT NOT NULL DEFAULT 'publico',
    "rating_actual" DECIMAL(3,2) NOT NULL DEFAULT 0,

    CONSTRAINT "jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "capitan_id" UUID,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo_miembro" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipo_id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "rol" "RolEnEquipo" NOT NULL DEFAULT 'jugador',
    "estado" "EstadoMiembro" NOT NULL DEFAULT 'activo',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_miembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancha" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "ubicacion_name" TEXT,
    "geom" geography(POINT,4326),
    "politicas" JSONB NOT NULL DEFAULT '{}',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "owner_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cancha_id" UUID NOT NULL,
    "nombre" TEXT,
    "modalidad" "Modalidad" NOT NULL,
    "precio_base_cents" INTEGER NOT NULL,
    "duracion_min" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_slot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campo_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "estado" "EstadoSlot" NOT NULL DEFAULT 'libre',
    "precio_cents" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agenda_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partido" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cancha_id" UUID,
    "campo_id" UUID,
    "fecha" TIMESTAMPTZ NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'programado',
    "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partido_equipo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partido_id" UUID NOT NULL,
    "equipo_id" UUID,
    "es_local" BOOLEAN,
    "goles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "partido_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cancha_id" UUID,
    "partido_id" UUID,
    "slot_id" UUID,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'pendiente',
    "importe_cents" INTEGER NOT NULL,
    "sena_cents" INTEGER NOT NULL DEFAULT 0,
    "fees_cents" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion" (
    "partido_id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,
    "asistencias" INTEGER NOT NULL DEFAULT 0,
    "atajadas" INTEGER NOT NULL DEFAULT 0,
    "calificacion" INTEGER,
    "notas" TEXT,
    "cargado_por" UUID,
    "validado_por" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participacion_pkey" PRIMARY KEY ("partido_id","jugador_id")
);

-- CreateTable
CREATE TABLE "resena" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "autor_id" UUID,
    "tipo_objeto" TEXT NOT NULL,
    "objeto_id" UUID NOT NULL,
    "puntaje" INTEGER,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reserva_id" UUID NOT NULL,
    "proveedor" "ProveedorPago" NOT NULL,
    "ext_payment_id" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'iniciado',
    "monto_cents" INTEGER NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "split_json" JSONB,
    "pagador_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partido_id" UUID NOT NULL,
    "motivo" TEXT,
    "estado" "EstadoDisputa" NOT NULL DEFAULT 'abierta',
    "abierta_por" UUID,
    "cerrada_por" UUID,
    "resolucion" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "disputa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "objeto" TEXT NOT NULL,
    "objeto_id" UUID,
    "accion" TEXT NOT NULL,
    "cambio" JSONB,
    "ip" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimiento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mensaje" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope_tipo" TEXT NOT NULL,
    "scope_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "idx_usuario_email" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "idx_role_user" ON "role_assignment"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_usuario_id_rol_scope_id_key" ON "role_assignment"("usuario_id", "rol", "scope_id");

-- CreateIndex
CREATE INDEX "idx_em_jugador" ON "equipo_miembro"("jugador_id");

-- CreateIndex
CREATE INDEX "idx_em_equipo" ON "equipo_miembro"("equipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_miembro_equipo_id_jugador_id_key" ON "equipo_miembro"("equipo_id", "jugador_id");

-- CreateIndex
CREATE INDEX "idx_cancha_owner" ON "cancha"("owner_id");

-- CreateIndex
CREATE INDEX "idx_campo_cancha" ON "campo"("cancha_id");

-- CreateIndex
CREATE INDEX "idx_slot_campo_inicio" ON "agenda_slot"("campo_id", "inicio", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_slot_campo_id_inicio_key" ON "agenda_slot"("campo_id", "inicio");

-- CreateIndex
CREATE INDEX "idx_partido_fecha" ON "partido"("fecha", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "partido_equipo_partido_id_es_local_key" ON "partido_equipo"("partido_id", "es_local");

-- CreateIndex
CREATE UNIQUE INDEX "reserva_partido_id_key" ON "reserva"("partido_id");

-- CreateIndex
CREATE UNIQUE INDEX "reserva_slot_id_key" ON "reserva"("slot_id");

-- CreateIndex
CREATE INDEX "idx_reserva_estado" ON "reserva"("estado");

-- CreateIndex
CREATE INDEX "idx_reserva_expires" ON "reserva"("expires_at", "estado");

-- CreateIndex
CREATE INDEX "idx_resena_objeto" ON "resena"("tipo_objeto", "objeto_id");

-- CreateIndex
CREATE UNIQUE INDEX "pago_ext_payment_id_key" ON "pago"("ext_payment_id");

-- CreateIndex
CREATE INDEX "idx_pago_ext" ON "pago"("ext_payment_id");

-- CreateIndex
CREATE INDEX "idx_pago_reserva" ON "pago"("reserva_id");

-- CreateIndex
CREATE INDEX "idx_audit_objeto" ON "audit_log"("objeto", "objeto_id");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "audit_log"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "consentimiento_usuario_id_tipo_key" ON "consentimiento"("usuario_id", "tipo");

-- CreateIndex
CREATE INDEX "idx_chat_scope" ON "chat_mensaje"("scope_tipo", "scope_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugador" ADD CONSTRAINT "jugador_id_fkey" FOREIGN KEY ("id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_capitan_id_fkey" FOREIGN KEY ("capitan_id") REFERENCES "jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_miembro" ADD CONSTRAINT "equipo_miembro_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_miembro" ADD CONSTRAINT "equipo_miembro_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancha" ADD CONSTRAINT "cancha_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo" ADD CONSTRAINT "campo_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "cancha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_slot" ADD CONSTRAINT "agenda_slot_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido" ADD CONSTRAINT "partido_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido" ADD CONSTRAINT "partido_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "campo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido_equipo" ADD CONSTRAINT "partido_equipo_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido_equipo" ADD CONSTRAINT "partido_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "agenda_slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_cargado_por_fkey" FOREIGN KEY ("cargado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "fk_resena_cancha" FOREIGN KEY ("objeto_id") REFERENCES "cancha"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_pagador_id_fkey" FOREIGN KEY ("pagador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_abierta_por_fkey" FOREIGN KEY ("abierta_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_cerrada_por_fkey" FOREIGN KEY ("cerrada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimiento" ADD CONSTRAINT "consentimiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensaje" ADD CONSTRAINT "chat_mensaje_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
