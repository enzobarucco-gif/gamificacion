'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useState } from 'react';

const schema = z.object({
  new_password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await apiClient.post('/auth/password/reset', { token, new_password: data.new_password });
      router.push('/login?reset=1');
    } catch (e) {
      if (e instanceof PgdApiError) setError(e.message);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>Elegí una contraseña segura</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input id="new_password" type="password" placeholder="Mínimo 8 caracteres"
                error={errors.new_password?.message ?? false} {...register('new_password')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" type="password" placeholder="Repetí la contraseña"
                error={errors.confirm?.message ?? false} {...register('confirm')} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
              {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
