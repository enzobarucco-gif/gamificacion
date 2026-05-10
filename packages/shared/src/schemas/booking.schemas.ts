import { z } from 'zod';

export const CreateBookingSchema = z.object({
  slot_id: z.string().uuid(),
  partido_id: z.string().uuid().optional(),
  sena_cents: z.number().int().nonnegative().optional(),
});

export const CancelBookingSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;
