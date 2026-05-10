import { z } from 'zod';

export const CreateTeamSchema = z.object({
  nombre: z.string().min(2).max(100),
  avatar: z.string().url().optional(),
});

export const UpdateTeamSchema = CreateTeamSchema.partial();

export const InviteMemberSchema = z.object({
  jugador_id: z.string().uuid(),
});

export const UpdateMemberSchema = z.object({
  rol: z.enum(['jugador', 'capitan', 'dt']).optional(),
  estado: z.enum(['pendiente', 'activo', 'saliente']).optional(),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
