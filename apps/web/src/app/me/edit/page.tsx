'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth.store';
import { useState } from 'react';

const POSICIONES = ['delantero', 'mediocampista', 'defensor', 'arquero'] as const;
const PIE_HABIL = ['derecho', 'izquierdo', 'ambos'] as const;
const PRIVACIDAD = ['publico', 'semipublico', 'privado'] as const;

const schema = z.object({
  posicion: z.enum(POSICIONES).optional(),
  pie_habil: z.enum(PIE_HABIL).optional(),
  fecha_nac: z.string().optional(),
  estatura_cm: z.coerce.number().int().min(100).max(250).optional(),
  privacidad: z.enum(PRIVACIDAD).optional(),
  foto_url: z.string().url('URL inválida').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface PlayerProfile {
  id: string; nombre: string; posicion: string | null; pie_habil: string | null;
  fecha_nac: string | null; estatura_cm: number | null; privacidad: string; avatar_url: string | null;
}

export default function EditProfilePage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  const { data: profile } = useQuery<PlayerProfile>({
    queryKey: ['player', user?.sub],
    queryFn: () => apiClient.get<PlayerProfile>(`/players/${user!.sub}`),
    enabled: !!user?.sub,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        posicion: (profile.posicion as (typeof POSICIONES)[number]) ?? undefined,
        pie_habil: (profile.pie_habil as (typeof PIE_HABIL)[number]) ?? undefined,
        fecha_nac: profile.fecha_nac ?? undefined,
        estatura_cm: profile.estatura_cm ?? undefined,
        privacidad: (profile.privacidad as (typeof PRIVACIDAD)[number]) ?? 'publico',
        foto_url: profile.avatar_url ?? undefined,
      });
    }
  }, [profile, reset]);

  const save = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.patch(`/players/${user!.sub}`, {
        ...(data.posicion ? { posicion: data.posicion } : {}),
        ...(data.pie_habil ? { pie_habil: data.pie_habil } : {}),
        ...(data.fecha_nac ? { fecha_nac: data.fecha_nac } : {}),
        ...(data.estatura_cm ? { estatura_cm: data.estatura_cm } : {}),
        ...(data.privacidad ? { privacidad: data.privacidad } : {}),
        ...(data.foto_url ? { foto_url: data.foto_url } : {}),
      }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      qc.invalidateQueries({ queryKey: ['player', user?.sub] });
    },
    onError: (e) => { if (e instanceof PgdApiError) setError(e.message); },
  });

  if (!token) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Editar perfil</h1>
      <Card>
        <CardHeader><CardTitle>Datos del jugador</CardTitle></CardHeader>
        <CardContent className="pt-2">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              Perfil actualizado correctamente.
            </div>
          )}
          <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="posicion">Posición</Label>
              <select
                id="posicion"
                {...register('posicion')}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Sin especificar —</option>
                {POSICIONES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pie_habil">Pie hábil</Label>
              <select
                id="pie_habil"
                {...register('pie_habil')}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Sin especificar —</option>
                {PIE_HABIL.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fecha_nac">Fecha de nacimiento</Label>
              <Input id="fecha_nac" type="date" error={errors.fecha_nac?.message ?? false} {...register('fecha_nac')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="estatura_cm">Estatura (cm)</Label>
              <Input
                id="estatura_cm"
                type="number"
                placeholder="175"
                error={errors.estatura_cm?.message ?? false}
                {...register('estatura_cm')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="foto_url">URL de foto de perfil</Label>
              <Input
                id="foto_url"
                type="url"
                placeholder="https://..."
                error={errors.foto_url?.message ?? false}
                {...register('foto_url')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="privacidad">Privacidad del perfil</Label>
              <select
                id="privacidad"
                {...register('privacidad')}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PRIVACIDAD.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
