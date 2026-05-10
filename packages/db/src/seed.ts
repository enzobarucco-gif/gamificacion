import { PrismaClient, Modalidad, RolSistema, EstadoSlot } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function hash(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

// Barrios porteños con coordenadas reales
const CANCHAS_GEO = [
  { nombre: 'Complejo Palermo Sports', barrio: 'Palermo', lat: -34.5834, lng: -58.4347 },
  { nombre: 'La Bombonera Amateur', barrio: 'La Boca', lat: -34.6345, lng: -58.3660 },
];

// Contraseña de todos los usuarios seed: "seed1234"
const SEED_PASSWORD = 'seed1234';

async function main() {
  console.log('🌱 Iniciando seed PGD...');

  // ── Limpiar en orden seguro ────────────────────────────────────────────────
  await prisma.participacion.deleteMany();
  await prisma.chatMensaje.deleteMany();
  await prisma.consentimiento.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.disputa.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.agendaSlot.deleteMany();
  await prisma.partidoEquipo.deleteMany();
  await prisma.partido.deleteMany();
  await prisma.resena.deleteMany();
  await prisma.campo.deleteMany();
  await prisma.cancha.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.jugador.deleteMany();
  await prisma.usuario.deleteMany();
  console.log('  ✓ Base limpia');

  const pw = await hash(SEED_PASSWORD);

  // ── Super admin ────────────────────────────────────────────────────────────
  const superAdmin = await prisma.usuario.create({
    data: {
      email: 'superadmin@pgd.dev',
      nombre: 'Super Admin',
      hashPassword: pw,
      verificadoEmail: true,
      roleAssignments: { create: { rol: RolSistema.super_admin } },
    },
  });

  // ── Dueño de cancha ────────────────────────────────────────────────────────
  const owner = await prisma.usuario.create({
    data: {
      email: 'cancha@pgd.dev',
      nombre: 'Roberto Cancha',
      hashPassword: pw,
      verificadoEmail: true,
      roleAssignments: { create: { rol: RolSistema.cancha_admin } },
    },
  });

  // ── 10 jugadores (2 equipos de 5) ─────────────────────────────────────────
  const jugadoresData = [
    // Equipo A — Los Pibes del Barrio
    { nombre: 'Matías Fernández', email: 'mati@pgd.dev',  posicion: 'delantero',     pie: 'derecho',    rating: 4.5 },
    { nombre: 'Lucas Gómez',     email: 'lucas@pgd.dev', posicion: 'mediocampista', pie: 'izquierdo',  rating: 4.1 },
    { nombre: 'Tomás Rodríguez', email: 'tomas@pgd.dev', posicion: 'defensor',      pie: 'derecho',    rating: 3.8 },
    { nombre: 'Nicolás López',   email: 'nico@pgd.dev',  posicion: 'defensor',      pie: 'derecho',    rating: 3.9 },
    { nombre: 'Agustín Martínez',email: 'agus@pgd.dev',  posicion: 'arquero',       pie: 'derecho',    rating: 4.2 },
    // Equipo B — Estrellas del Sur
    { nombre: 'Diego Herrera',   email: 'diego@pgd.dev', posicion: 'delantero',     pie: 'izquierdo',  rating: 4.3 },
    { nombre: 'Pablo Suárez',    email: 'pablo@pgd.dev', posicion: 'mediocampista', pie: 'derecho',    rating: 4.0 },
    { nombre: 'Andrés Castro',   email: 'andres@pgd.dev',posicion: 'defensor',      pie: 'derecho',    rating: 3.7 },
    { nombre: 'Federico Torres', email: 'fede@pgd.dev',  posicion: 'defensor',      pie: 'izquierdo',  rating: 3.6 },
    { nombre: 'Ramiro Vega',     email: 'ramiro@pgd.dev',posicion: 'arquero',       pie: 'derecho',    rating: 4.1 },
  ];

  const usuarios = await Promise.all(
    jugadoresData.map((d) =>
      prisma.usuario.create({
        data: {
          email: d.email,
          nombre: d.nombre,
          hashPassword: pw,
          verificadoEmail: true,
          jugador: {
            create: {
              posicion: d.posicion,
              pieHabil: d.pie,
              disponibilidad: { lunes: true, miercoles: true, viernes: true, sabado: true },
              privacidad: 'publico',
              ratingActual: d.rating,
            },
          },
          roleAssignments: { create: { rol: RolSistema.jugador } },
        },
        include: { jugador: true },
      }),
    ),
  );
  console.log(`  ✓ ${usuarios.length} jugadores creados`);

  const [u0, u1, u2, u3, u4, u5, u6, u7, u8, u9] = usuarios as NonNullable<typeof usuarios>;

  // ── Equipo A ───────────────────────────────────────────────────────────────
  const equipoA = await prisma.equipo.create({
    data: {
      nombre: 'Los Pibes del Barrio',
      capitanId: u0!.jugador!.id,
      miembros: {
        create: [u0, u1, u2, u3, u4].map((u, i) => ({
          jugadorId: u!.jugador!.id,
          rol: i === 0 ? 'capitan' : 'jugador',
          estado: 'activo',
        })),
      },
    },
  });
  await prisma.roleAssignment.create({
    data: { usuarioId: u0!.id, rol: RolSistema.capitan, scopeId: equipoA.id },
  });

  // ── Equipo B ───────────────────────────────────────────────────────────────
  const equipoB = await prisma.equipo.create({
    data: {
      nombre: 'Estrellas del Sur',
      capitanId: u5!.jugador!.id,
      miembros: {
        create: [u5, u6, u7, u8, u9].map((u, i) => ({
          jugadorId: u!.jugador!.id,
          rol: i === 0 ? 'capitan' : 'jugador',
          estado: 'activo',
        })),
      },
    },
  });
  await prisma.roleAssignment.create({
    data: { usuarioId: u5!.id, rol: RolSistema.capitan, scopeId: equipoB.id },
  });
  console.log('  ✓ 2 equipos creados');

  // ── 2 canchas con 3 campos cada una ───────────────────────────────────────
  const canchas = await Promise.all(
    CANCHAS_GEO.map(async (geo) => {
      const cancha = await prisma.cancha.create({
        data: {
          nombre: geo.nombre,
          ubicacionName: `${geo.barrio}, Buenos Aires`,
          politicas: { cancelacion_horas: 24, sena_pct: 30, permite_split: true },
          rating: parseFloat((Math.random() * 0.8 + 4.1).toFixed(2)),
          ownerId: owner.id,
        },
      });

      await prisma.$executeRawUnsafe(
        `UPDATE cancha SET geom = ST_GeogFromText('SRID=4326;POINT(${geo.lng} ${geo.lat})') WHERE id = '${cancha.id}'`,
      );

      await prisma.roleAssignment.create({
        data: { usuarioId: owner.id, rol: RolSistema.cancha_admin, scopeId: cancha.id },
      });

      const modalidades = [
        { modalidad: Modalidad.F5,     precio: 8_000,  nombre: 'Campo F5' },
        { modalidad: Modalidad.F7,     precio: 12_000, nombre: 'Campo F7' },
        { modalidad: Modalidad.FUTSAL, precio: 10_000, nombre: 'Cancha Futsal' },
      ];

      const campos = await Promise.all(
        modalidades.map((m) =>
          prisma.campo.create({
            data: {
              canchaId: cancha.id,
              nombre: m.nombre,
              modalidad: m.modalidad,
              precioBaseCents: m.precio * 100,
              duracionMin: 60,
            },
          }),
        ),
      );

      return { cancha, campos };
    }),
  );
  console.log(`  ✓ ${canchas.length} canchas creadas`);

  // ── Slots: próximos 14 días, 18–22 hs ─────────────────────────────────────
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const horasSlot = [18, 19, 20, 21, 22];
  let slotCount = 0;

  for (const { campos } of canchas) {
    for (const campo of campos) {
      for (let dia = 0; dia < 14; dia++) {
        for (const hora of horasSlot) {
          const inicio = new Date(hoy);
          inicio.setDate(hoy.getDate() + dia);
          inicio.setHours(hora, 0, 0, 0);
          const fin = new Date(inicio);
          fin.setHours(hora + 1, 0, 0, 0);
          await prisma.agendaSlot.create({
            data: { campoId: campo.id, inicio, fin, estado: EstadoSlot.libre, precioCents: campo.precioBaseCents },
          });
          slotCount++;
        }
      }
    }
  }
  console.log(`  ✓ ${slotCount} slots creados`);

  // ── Partido JUGADO con stats validadas (ayer) ──────────────────────────────
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  ayer.setHours(20, 0, 0, 0);

  const canchaA = canchas[0]!;
  const campoF5 = canchaA.campos[0]!;

  const partidoJugado = await prisma.partido.create({
    data: {
      canchaId: canchaA.cancha.id,
      campoId: campoF5.id,
      fecha: ayer,
      modalidad: Modalidad.F5,
      estado: 'jugado',
      estadoValidacion: 'validado',
      equipos: {
        create: [
          { equipoId: equipoA.id, esLocal: true,  goles: 3 },
          { equipoId: equipoB.id, esLocal: false, goles: 1 },
        ],
      },
      participaciones: {
        create: [
          { jugadorId: u0!.jugador!.id, minutos: 60, goles: 2, asistencias: 1, atajadas: 0, calificacion: 9, cargadoPorId: u0!.id, validadoPorId: u5!.id },
          { jugadorId: u1!.jugador!.id, minutos: 60, goles: 1, asistencias: 2, atajadas: 0, calificacion: 8, cargadoPorId: u0!.id, validadoPorId: u5!.id },
          { jugadorId: u2!.jugador!.id, minutos: 60, goles: 0, asistencias: 0, atajadas: 0, calificacion: 7, cargadoPorId: u0!.id, validadoPorId: u5!.id },
          { jugadorId: u3!.jugador!.id, minutos: 60, goles: 0, asistencias: 1, atajadas: 0, calificacion: 7, cargadoPorId: u0!.id, validadoPorId: u5!.id },
          { jugadorId: u4!.jugador!.id, minutos: 60, goles: 0, asistencias: 0, atajadas: 3, calificacion: 8, cargadoPorId: u0!.id, validadoPorId: u5!.id },
          { jugadorId: u5!.jugador!.id, minutos: 60, goles: 1, asistencias: 0, atajadas: 0, calificacion: 6, cargadoPorId: u5!.id, validadoPorId: u0!.id },
          { jugadorId: u6!.jugador!.id, minutos: 60, goles: 0, asistencias: 1, atajadas: 0, calificacion: 6, cargadoPorId: u5!.id, validadoPorId: u0!.id },
          { jugadorId: u7!.jugador!.id, minutos: 60, goles: 0, asistencias: 0, atajadas: 0, calificacion: 5, cargadoPorId: u5!.id, validadoPorId: u0!.id },
          { jugadorId: u8!.jugador!.id, minutos: 60, goles: 0, asistencias: 0, atajadas: 0, calificacion: 5, cargadoPorId: u5!.id, validadoPorId: u0!.id },
          { jugadorId: u9!.jugador!.id, minutos: 60, goles: 0, asistencias: 0, atajadas: 4, calificacion: 7, cargadoPorId: u5!.id, validadoPorId: u0!.id },
        ],
      },
    },
  });

  // Reserva PAGADA para ese partido
  const slotAyer = await prisma.agendaSlot.findFirst({
    where: { campoId: campoF5.id },
  });
  if (slotAyer) {
    const reservaPagada = await prisma.reserva.create({
      data: {
        canchaId: canchaA.cancha.id,
        partidoId: partidoJugado.id,
        slotId: slotAyer.id,
        estado: 'pagada',
        importeCents: campoF5.precioBaseCents,
        senaCents: Math.floor(campoF5.precioBaseCents * 0.3),
      },
    });
    await prisma.pago.create({
      data: {
        reservaId: reservaPagada.id,
        proveedor: 'mercado_pago',
        extPaymentId: 'mp-seed-001',
        estado: 'aprobado',
        montoCents: reservaPagada.senaCents,
        pagadorId: u0!.id,
      },
    });
    await prisma.agendaSlot.update({
      where: { id: slotAyer.id },
      data: { estado: EstadoSlot.reservado },
    });
  }
  console.log('  ✓ Partido jugado con stats validadas y reserva pagada');

  // ── Partido PROGRAMADO para mañana ─────────────────────────────────────────
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  manana.setHours(20, 0, 0, 0);

  const slotManana = await prisma.agendaSlot.findFirst({
    where: { campoId: campoF5.id, inicio: manana, estado: EstadoSlot.libre },
  });

  const partidoManana = await prisma.partido.create({
    data: {
      canchaId: canchaA.cancha.id,
      campoId: campoF5.id,
      fecha: manana,
      modalidad: Modalidad.F5,
      estado: 'programado',
      estadoValidacion: 'pendiente',
      equipos: {
        create: [
          { equipoId: equipoA.id, esLocal: true,  goles: 0 },
          { equipoId: equipoB.id, esLocal: false, goles: 0 },
        ],
      },
    },
  });

  if (slotManana) {
    const reservaPendiente = await prisma.reserva.create({
      data: {
        canchaId: canchaA.cancha.id,
        partidoId: partidoManana.id,
        slotId: slotManana.id,
        estado: 'pendiente',
        importeCents: campoF5.precioBaseCents,
        senaCents: Math.floor(campoF5.precioBaseCents * 0.3),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await prisma.pago.create({
      data: {
        reservaId: reservaPendiente.id,
        proveedor: 'mercado_pago',
        extPaymentId: 'mp-seed-002',
        estado: 'iniciado',
        montoCents: reservaPendiente.senaCents,
        pagadorId: u0!.id,
      },
    });
    await prisma.agendaSlot.update({
      where: { id: slotManana.id },
      data: { estado: EstadoSlot.reservado },
    });
  }
  console.log('  ✓ Partido programado para mañana con reserva pendiente');

  // ── Reseñas de canchas ─────────────────────────────────────────────────────
  const reseñas = [
    { puntaje: 5, comentario: 'Excelente cancha, muy bien mantenida. El piso es perfecto.', autorId: u0!.id },
    { puntaje: 4, comentario: 'Buena iluminación y vestuarios limpios. Recomendada.',       autorId: u1!.id },
    { puntaje: 5, comentario: 'La mejor cancha de la zona, siempre volvemos.',              autorId: u5!.id },
  ];

  for (const r of reseñas) {
    await prisma.resena.create({
      data: {
        autorId: r.autorId,
        tipoObjeto: 'cancha',
        objetoId: canchaA.cancha.id,
        puntaje: r.puntaje,
        comentario: r.comentario,
      },
    });
  }

  // Actualizar rating de la cancha
  const avg = reseñas.reduce((s, r) => s + r.puntaje, 0) / reseñas.length;
  await prisma.cancha.update({
    where: { id: canchaA.cancha.id },
    data: { rating: parseFloat(avg.toFixed(2)) },
  });
  console.log('  ✓ Reseñas creadas');

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completado.\n');
  console.log('Usuarios de prueba (contraseña: seed1234):');
  console.log('  superadmin@pgd.dev  — super_admin');
  console.log('  cancha@pgd.dev      — cancha_admin');
  console.log('  mati@pgd.dev        — capitán "Los Pibes del Barrio"');
  console.log('  diego@pgd.dev       — capitán "Estrellas del Sur"');
  console.log('  lucas@pgd.dev       — jugador');
  console.log(`\nDatos creados:`);
  console.log(`  ${canchas.length} canchas · ${slotCount} slots · 2 equipos · 2 partidos · ${reseñas.length} reseñas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
