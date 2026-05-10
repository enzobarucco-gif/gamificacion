'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';

const schema = z.object({ email: z.string().email('Email inválido') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await apiClient.post('/auth/password/forgot', data);
      setSent(true);
    } catch (e) {
      if (e instanceof PgdApiError) setError(e.message);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>Te enviamos un link para restablecer tu contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-neutral-600">
                Si el email está registrado, recibirás las instrucciones en tu casilla.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Volver al inicio de sesión</Button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com"
                    error={errors.email?.message ?? false} {...register('email')} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-neutral-500">
                <Link href="/login" className="text-primary-600 hover:underline">Volver al inicio de sesión</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
