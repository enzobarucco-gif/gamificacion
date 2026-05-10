import { PrismaClient, Modalidad, RolSistema, EstadoSlot } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Genera un hash bcrypt-like simple para seed (no usar en producción)
function hashPassword(plain: string): string {
  return '$seed$' + createHash('sha256').update(plain).digest('hex');
}

// Coordenadas de barrios de Buenos Aires
const CANCHAS_GEO = [
  { nombre: 'Cancha La Bombonera Amateur', barrio: 'La Boca', lat: -34.6345, lng: -58.3660 },
  { nombre: 'Complejo Palermo Sports', barrio: 'Palermo', lat: -34.5834, lng: -58.4347 },
];

async function main() {
  console.log('Iniciando seed...');

  // ============================================================
  // Limpiar datos previos en orden seguro
  // ============================================================
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

  console.log('Base limpia.');

  // ============================================================
  // 5 usuarios jugadores
  // ============================================================
  const jugadoresData = [
    { nombre: 'Matías Fernández', email: 'mati@pgd.dev', posicion: 'delantero', pieHabil: 'derecho' },
    { nombre: 'Lucas Gómez', email: 'lucas@pgd.dev', posicion: 'mediocampista', pieHabil: 'izquierdo' },
    { nombre: 'Tomás Rodríguez', email: 'tomas@pgd.dev', posicion: 'defensor', pieHabil: 'derecho' },
    { nombre: 'Nicolás López', email: 'nico@pgd.dev', posicion: 'arquero', pieHabil: 'derecho' },
    { nombre: 'Agustín Martínez', email: 'agus@pgd.dev', posicion: 'delantero', pieHabil: 'izquierdo' },
  ];

  const usuarios = await Promise.all(
    jugadoresData.map((d) =>
      prisma.usuario.create({
        data: {
          email: d.email,
          nombre: d.nombre,
          hashPassword: hashPassword('seed1234'),
          verificadoEmail: true,
          jugador: {
            create: {
              posicion: d.posicion,
              pieHabil: d.pieHabil,
              disponibilidad: { lunes: true, miercoles: true, viernes: true, sabado: true },
              privacidad: 'publico',
              ratingActual: parseFloat((Math.random() * 2 + 3).toFixed(2)),
            },
          },
          roleAssignments: {
            create: { rol: RolSistema.jugador },
          },
        },
        include: { jugador: true },
      }),
    ),
  );
  console.log(`Creados ${usuarios.length} jugadores.`);

  // ============================================================
  // 1 usuario dueño de cancha
  // ============================================================
  const owner = await prisma.usuario.create({
    data: {
      email: 'admin@pgd.dev',
      nombre: 'Roberto Cancha',
      hashPassword: hashPassword('seed1234'),
      verificadoEmail: true,
      roleAssignments: {
        create: { rol: RolSistema.cancha_admin },
      },
    },
  });
  console.log('Creado owner de cancha.');

  // ============================================================
  // 2 canchas con 3 campos cada una (F5, F7, FUTSAL)
  // ============================================================
  const canchas = await Promise.all(
    CANCHAS_GEO.map(async (geo) => {
      const cancha = await prisma.cancha.create({
        data: {
          nombre: geo.nombre,
          ubicacionName: `${geo.barrio}, Buenos Aires`,
          politicas: { cancelacion_horas: 24, sena_pct: 30, permite_split: true },
          rating: parseFloat((Math.random() * 1 + 4).toFixed(2)),
          ownerId: owner.id,
        },
      });

      // Actualiza geom via raw (PostGIS)
      await prisma.$executeRawUnsafe(
        `UPDATE cancha SET geom = ST_GeogFromText('SRID=4326;POINT(${geo.lng} ${geo.lat})') WHERE id = '${cancha.id}'`,
      );

      // 3 campos por cancha
      const modalidades: { modalidad: Modalidad; precio: number }[] = [
        { modalidad: Modalidad.F5, precio: 8000 },
        { modalidad: Modalidad.F7, precio: 12000 },
        { modalidad: Modalidad.FUTSAL, precio: 10000 },
      ];
      const campos = await Promise.all(
        modalidades.map((m) =>
          prisma.campo.create({
            data: {
              canchaId: cancha.id,
              nombre: `Campo ${m.modalidad}`,
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
  console.log(`Creadas ${canchas.length} canchas con 3 campos cada una.`);

  // ============================================================
  // Slots para 14 días (18:00–23:00, cada 60 min = 5 slots/día)
  // ============================================================
  const horasSlot = [18, 19, 20, 21, 22];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

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
            data: {
              campoId: campo.id,
              inicio,
              fin,
              estado: EstadoSlot.libre,
              precioCents: campo.precioBaseCents,
            },
          });
          slotCount++;
        }
      }
    }
  }
  console.log(`Creados ${slotCount} slots (${canchas.length} canchas × 3 campos × 14 días × 5 horas).`);

  // ============================================================
  // 1 equipo con los 5 jugadores
  // ============================================================
  const capitan = usuarios[0]!;
  const equipo = await prisma.equipo.create({
    data: {
      nombre: 'Los Pibes del Barrio',
      capitanId: capitan.jugador!.id,
      miembros: {
        create: usuarios.map((u, i) => ({
          jugadorId: u.jugador!.id,
          rol: i === 0 ? 'capitan' : 'jugador',
          estado: 'activo',
        })),
      },
    },
  });

  // Asignar rol capitan al primer usuario en el scope del equipo
  await prisma.roleAssignment.create({
    data: { usuarioId: capitan.id, rol: RolSistema.capitan, scopeId: equipo.id },
  });
  console.log(`Creado equipo "${equipo.nombre}" con ${usuarios.length} miembros.`);

  // ============================================================
  // 1 partido programado para mañana
  // ============================================================
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  manana.setHours(20, 0, 0, 0);

  const primerCampo = canchas[0]!.campos[0]!;
  const slotPartido = await prisma.agendaSlot.findFirst({
    where: { campoId: primerCampo.id, inicio: manana, estado: EstadoSlot.libre },
  });

  const partido = await prisma.partido.create({
    data: {
      canchaId: canchas[0]!.cancha.id,
      campoId: primerCampo.id,
      fecha: manana,
      modalidad: Modalidad.F5,
      estado: 'programado',
      estadoValidacion: 'pendiente',
      equipos: {
        create: [{ equipoId: equipo.id, esLocal: true, goles: 0 }],
      },
    },
  });

  // Reserva del partido (pendiente de pago)
  if (slotPartido) {
    await prisma.reserva.create({
      data: {
        canchaId: canchas[0]!.cancha.id,
        partidoId: partido.id,
        slotId: slotPartido.id,
        estado: 'pendiente',
        importeCents: primerCampo.precioBaseCents,
        senaCents: Math.floor(primerCampo.precioBaseCents * 0.3),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await prisma.agendaSlot.update({
      where: { id: slotPartido.id },
      data: { estado: EstadoSlot.reservado },
    });
  }

  console.log(`Creado partido programado para mañana ${manana.toISOString()}.`);
  console.log('\nSeed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
