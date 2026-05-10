'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Card, CardContent, Spinner } from '@pgd/ui';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth.store';

interface Match {
  id: string; fecha: string; modalidad: string; estado: string;
  estado_validacion: string; equipos: Array<{ equipo_id: string | null; nombre: string | null; es_local: boolean | null; goles: number }>;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const valColor: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  validado: 'success', disputa: 'destructive', parcial: 'warning', pendiente: 'default',
};

export default function MatchesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['my-matches'],
    queryFn: () => apiClient.get<Match[]>('/matches/me'),
    enabled: !!token,
  });

  if (!token || isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Mis partidos</h1>
      {(matches ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-neutral-400">No tenés partidos registrados.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(matches ?? []).map((m) => {
            const local = m.equipos.find((e) => e.es_local);
            const visitante = m.equipos.find((e) => !e.es_local);
            return (
              <Link key={m.id} href={`/matches/${m.id}`}>
                <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-medium text-neutral-800">
                        {local?.nombre ?? 'Equipo A'}{' '}
                        <span className="text-neutral-400">vs</span>{' '}
                        {visitante?.nombre ?? 'Equipo B'}
                      </div>
                      <div className="text-sm text-neutral-400 mt-0.5">{fmtFecha(m.fecha)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{m.modalidad}</Badge>
                      <Badge variant={valColor[m.estado_validacion] ?? 'default'}>{m.estado_validacion}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
