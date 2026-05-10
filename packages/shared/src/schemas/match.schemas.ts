import { z } from 'zod';

const ModalidadEnum = z.enum(['F5', 'F6', 'F7', 'FUTSAL']);

export const CreateMatchSchema = z.object({
  equipo_a_id: z.string().uuid().optional(),
  equipo_b_id: z.string().uuid().optional(),
  modalidad: ModalidadEnum,
  fecha: z.string().datetime(),
  campo_id: z.string().uuid().optional(),
  tipo: z.enum(['vs', 'pickup']),
});

const ParticipacionSchema = z.object({
  jugador_id: z.string().uuid(),
  minutos: z.number().int().nonnegative().max(120).optional(),
  goles: z.number().int().nonnegative().optional(),
  asistencias: z.number().int().nonnegative().optional(),
  atajadas: z.number().int().nonnegative().optional(),
  calificacion: z.number().int().min(1).max(10).optional(),
  notas: z.string().max(500).optional(),
});

export const LoadStatsSchema = z.object({
  participaciones: z.array(ParticipacionSchema).min(1),
});

export const ValidateMatchSchema = z.object({
  ok: z.boolean(),
  observaciones: z.string().max(1000).optional(),
});

export const OpenDisputeSchema = z.object({
  motivo: z.string().min(10).max(1000),
});

export const CloseDisputeSchema = z.object({
  resolucion: z.string().min(10).max(2000),
});

export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;
export type LoadStatsInput = z.infer<typeof LoadStatsSchema>;
export type ValidateMatchInput = z.infer<typeof ValidateMatchSchema>;
export type OpenDisputeInput = z.infer<typeof OpenDisputeSchema>;
export type CloseDisputeInput = z.infer<typeof CloseDisputeSchema>;
