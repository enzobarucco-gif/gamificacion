'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth.store';
import { useMe } from '../../hooks/use-auth';

interface Booking {
  id: string; estado: string; importe_cents: number; sena_cents: number;
  expires_at: string | null; created_at: string;
}
interface Team { id: string; nombre: string; mi_rol: string; total_activos: number }
interface Match { id: string; fecha: string; modalidad: string; estado: string; estado_validacion: string }

function fmtPrecio(cents: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const estadoColor: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  pendiente: 'warning', pagada: 'success', cancelada: 'destructive', no_presentado: 'destructive',
};

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const { data: me, isLoading: loadingMe } = useMe();

  const { data: bookings, isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: () => apiClient.get<Booking[]>('/bookings/me'),
    enabled: !!token,
  });

  const { data: teams, isLoading: loadingTeams } = useQuery<Team[]>({
    queryKey: ['my-teams'],
    queryFn: () => apiClient.get<Team[]>('/teams'),
    enabled: !!token,
  });

  const { data: matches, isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['my-matches'],
    queryFn: () => apiClient.get<Match[]>('/matches/me'),
    enabled: !!token,
  });

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token || loadingMe) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Hola, {me?.nombre ?? me?.email} 👋</h1>
        <p className="text-neutral-500 text-sm mt-1">Tu espacio personal en PGD</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Reservas */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mis reservas</CardTitle>
            <Link href="/venues" className="text-sm text-primary-600 hover:underline">+ Nueva</Link>
          </CardHeader>
          <CardContent>
            {loadingBookings ? <Spinner /> : (bookings ?? []).length === 0 ? (
              <p className="text-sm text-neutral-400">No tenés reservas aún. <Link href="/venues" className="text-primary-600 hover:underline">Buscá una cancha</Link>.</p>
            ) : (
              <div className="space-y-2">
                {(bookings ?? []).slice(0, 5).map((b) => (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 hover:border-primary-200 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{fmtFecha(b.created_at)}</div>
                      <div className="text-xs text-neutral-400">{fmtPrecio(b.importe_cents)}</div>
                    </div>
                    <Badge variant={estadoColor[b.estado] ?? 'default'}>{b.estado}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mis equipos</CardTitle>
            <Link href="/teams/new" className="text-sm text-primary-600 hover:underline">+ Crear</Link>
          </CardHeader>
          <CardContent>
            {loadingTeams ? <Spinner /> : (teams ?? []).length === 0 ? (
              <p className="text-sm text-neutral-400">No estás en ningún equipo. <Link href="/teams/new" className="text-primary-600 hover:underline">Creá uno</Link>.</p>
            ) : (
              <div className="space-y-2">
                {(teams ?? []).slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 hover:border-primary-200 transition-colors">
                    <div className="text-sm font-medium truncate">{t.nombre}</div>
                    <Badge variant="default">{t.mi_rol}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partidos */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimos partidos</CardTitle>
            <Link href="/matches" className="text-sm text-primary-600 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            {loadingMatches ? <Spinner /> : (matches ?? []).length === 0 ? (
              <p className="text-sm text-neutral-400">Aún no jugaste ningún partido registrado.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(matches ?? []).slice(0, 6).map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="rounded-lg border border-neutral-100 px-4 py-3 hover:border-primary-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="default">{m.modalidad}</Badge>
                      <span className="text-xs text-neutral-400">{fmtFecha(m.fecha)}</span>
                    </div>
                    <Badge variant={m.estado_validacion === 'validado' ? 'success' : m.estado_validacion === 'disputa' ? 'destructive' : 'warning'}>
                      {m.estado_validacion}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
