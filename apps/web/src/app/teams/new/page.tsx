'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useState } from 'react';

const schema = z.object({ nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100) });
type FormData = z.infer<typeof schema>;

export default function NewTeamPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const create = useMutation({
    mutationFn: (data: FormData) => apiClient.post<{ id: string }>('/teams', data),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['my-teams'] });
      router.push(`/teams/${team.id}`);
    },
    onError: (e) => { if (e instanceof PgdApiError) setError(e.message); },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Crear equipo</h1>
      <Card>
        <CardContent className="pt-6">
          {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre del equipo</Label>
              <Input id="nombre" placeholder="Los Cañones FC"
                error={errors.nombre?.message ?? false} {...register('nombre')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creando...' : 'Crear equipo'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
