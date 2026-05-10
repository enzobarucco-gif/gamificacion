import { z } from 'zod';

const PrivacidadEnum = z.enum(['publico', 'semipublico', 'privado']);

export const UpdatePlayerSchema = z.object({
  posicion: z.string().max(50).optional(),
  pie_habil: z.enum(['derecho', 'izquierdo', 'ambos']).optional(),
  fecha_nac: z.string().date().optional(),
  estatura_cm: z.number().int().min(100).max(250).optional(),
  disponibilidad: z.record(z.string(), z.boolean()).optional(),
  foto_url: z.string().url().optional(),
  privacidad: PrivacidadEnum.optional(),
});

export const SearchPlayersSchema = z.object({
  q: z.string().max(100).optional(),
  posicion: z.string().max(50).optional(),
  zona: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type SearchPlayersInput = z.infer<typeof SearchPlayersSchema>;
