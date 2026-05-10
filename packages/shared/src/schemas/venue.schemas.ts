import { z } from 'zod';

const ModalidadEnum = z.enum(['F5', 'F6', 'F7', 'FUTSAL']);

export const CreateVenueSchema = z.object({
  nombre: z.string().min(2).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  ubicacion_name: z.string().max(300).optional(),
  politicas: z
    .object({
      cancelacion_horas: z.number().int().nonnegative().optional(),
      sena_pct: z.number().int().min(0).max(100).optional(),
      permite_split: z.boolean().optional(),
    })
    .optional(),
});

export const UpdateVenueSchema = CreateVenueSchema.partial();

export const SearchVenuesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(50000).optional(),
  modalidad: ModalidadEnum.optional(),
  precio_max: z.coerce.number().int().positive().optional(),
  rating_min: z.coerce.number().min(1).max(5).optional(),
  disponibilidad: z.enum(['hoy', 'manana', 'esta_semana']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateFieldSchema = z.object({
  nombre: z.string().max(100).optional(),
  modalidad: ModalidadEnum,
  precio_base_cents: z.number().int().positive(),
  duracion_min: z.number().int().positive().default(60),
});

export const BulkCreateSlotsSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  duracion_min: z.number().int().positive().default(60),
  precio_cents: z.number().int().positive(),
  dias_semana: z.array(z.number().int().min(0).max(6)).optional(),
  hora_inicio: z.number().int().min(0).max(23),
  hora_fin: z.number().int().min(1).max(24),
});

export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;
export type SearchVenuesInput = z.infer<typeof SearchVenuesSchema>;
export type CreateFieldInput = z.infer<typeof CreateFieldSchema>;
export type BulkCreateSlotsInput = z.infer<typeof BulkCreateSlotsSchema>;
