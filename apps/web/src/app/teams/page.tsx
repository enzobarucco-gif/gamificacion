'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth.store';

interface Team { id: string; nombre: string; avatar_url: string | null; mi_rol: string; mi_estado: string; total_activos: number }

export default function TeamsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['my-teams'],
    queryFn: () => apiClient.get<Team[]>('/teams'),
    enabled: !!token,
  });

  if (!token || isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Mis equipos</h1>
        <Link href="/teams/new"><Button size="sm">+ Crear equipo</Button></Link>
      </div>

      {teams?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-400 mb-4">No estás en ningún equipo todavía.</p>
            <Link href="/teams/new"><Button>Crear mi primer equipo</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams?.map((t) => (
            <Link key={t.id} href={`/teams/${t.id}`}>
              <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="py-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700 shrink-0">
                    {t.nombre[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-neutral-800 truncate">{t.nombre}</div>
                    <div className="text-sm text-neutral-400">{t.total_activos} miembro{t.total_activos !== 1 ? 's' : ''}</div>
                  </div>
                  <Badge variant={t.mi_rol === 'capitan' ? 'primary' : 'default'}>{t.mi_rol}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
