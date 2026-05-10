import { z } from 'zod';

const ProveedorEnum = z.enum(['mercado_pago', 'stripe']);

export const InitCheckoutSchema = z.object({
  reserva_id: z.string().uuid(),
  proveedor: ProveedorEnum,
});

export const InitSplitSchema = z.object({
  reserva_id: z.string().uuid(),
  splits: z
    .array(
      z.object({
        usuario_id: z.string().uuid(),
        monto_cents: z.number().int().positive(),
      }),
    )
    .min(2),
});

export type InitCheckoutInput = z.infer<typeof InitCheckoutSchema>;
export type InitSplitInput = z.infer<typeof InitSplitSchema>;
