export { prisma } from './client.js';

export {
  PrismaClient,
  RolSistema,
  EstadoMiembro,
  RolEnEquipo,
  Modalidad,
  EstadoSlot,
  EstadoPartido,
  EstadoValidacion,
  EstadoReserva,
  EstadoPago,
  ProveedorPago,
  EstadoDisputa,
} from '@prisma/client';

export type {
  Usuario,
  RoleAssignment,
  Jugador,
  Equipo,
  EquipoMiembro,
  Cancha,
  Campo,
  AgendaSlot,
  Partido,
  PartidoEquipo,
  Reserva,
  Participacion,
  Resena,
  Pago,
  Disputa,
  AuditLog,
  Consentimiento,
  ChatMensaje,
  Prisma,
} from '@prisma/client';
