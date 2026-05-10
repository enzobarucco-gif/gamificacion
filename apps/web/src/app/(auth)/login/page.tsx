'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { useLogin } from '../../../hooks/use-auth';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const params = useSearchParams();
  const registered = params.get('registered');
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const login = useLogin();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Bienvenido a PGD</CardTitle>
          <CardDescription>Ingresá con tu cuenta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              Cuenta creada. Revisá tu email para verificarla.
            </div>
          )}
          {login.error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {login.error.message}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                error={errors.email?.message ?? false}
                {...register('email')}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message ?? false}
                {...register('password')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              Registrate gratis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
