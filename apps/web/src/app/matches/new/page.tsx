'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth.store';
import { useState } from 'react';

const MODALIDADES = ['F5', 'F6', 'F7', 'F8', 'F11'] as const;

const schema = z.object({
  modalidad: z.enum(MODALIDADES),
  fecha: z.string().min(1, 'Requerido'),
  equipo_a_id: z.string().uuid('UUID inválido').optional().or(z.literal('')),
  equipo_b_id: z.string().uuid('UUID inválido').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface MyTeam { id: string; nombre: string }

export default function NewMatchPage() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  const { data: teams } = useQuery<MyTeam[]>({
    queryKey: ['my-teams'],
    queryFn: () => apiClient.get<MyTeam[]>('/teams/me'),
    enabled: !!token,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modalidad: 'F5' },
  });

  const create = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.post<{ id: string }>('/matches', {
        modalidad: data.modalidad,
        fecha: new Date(data.fecha).toISOString(),
        ...(data.equipo_a_id ? { equipo_a_id: data.equipo_a_id } : {}),
        ...(data.equipo_b_id ? { equipo_b_id: data.equipo_b_id } : {}),
      }),
    onSuccess: (match) => {
      qc.invalidateQueries({ queryKey: ['my-matches'] });
      router.push(`/matches/${match.id}`);
    },
    onError: (e) => { if (e instanceof PgdApiError) setError(e.message); },
  });

  if (!token) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Crear partido</h1>
      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="modalidad">Modalidad</Label>
              <select
                id="modalidad"
                {...register('modalidad')}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.modalidad && <p className="text-xs text-red-600">{errors.modalidad.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="fecha">Fecha y hora</Label>
              <Input
                id="fecha"
                type="datetime-local"
                error={errors.fecha?.message ?? false}
                {...register('fecha')}
              />
            </div>

            {teams && teams.length > 0 && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="equipo_a_id">Mi equipo (local)</Label>
                  <select
                    id="equipo_a_id"
                    {...register('equipo_a_id')}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">— Sin asignar —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="equipo_b_id">Equipo rival (visitante)</Label>
                  <select
                    id="equipo_b_id"
                    {...register('equipo_b_id')}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">— Sin asignar —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creando...' : 'Crear partido'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
