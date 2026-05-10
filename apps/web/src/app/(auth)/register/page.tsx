'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@pgd/ui';
import { useRegister } from '../../../hooks/use-auth';

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const reg = useRegister();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Gratis, sin tarjeta de crédito</CardDescription>
        </CardHeader>
        <CardContent>
          {reg.error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {reg.error.message}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => reg.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                autoComplete="name"
                placeholder="Juan Pérez"
                error={errors.nombre?.message ?? false}
                {...register('nombre')}
              />
            </div>
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
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                error={errors.password?.message ?? false}
                {...register('password')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={reg.isPending}>
              {reg.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-primary-600 hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
