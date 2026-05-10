import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PGD — Plataforma de Gestión Deportiva',
};

// Server Component — no requiere 'use client'
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600">PGD</h1>
        <p className="mt-2 text-lg text-neutral-500">Plataforma de Gestión Deportiva</p>
        <p className="mt-1 text-sm text-neutral-400">Sprint 1 — skeleton activo</p>
      </div>
    </main>
  );
}
