'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient } from '../../../lib/api-client';

interface PlayerProfile {
  id: string; nombre: string | null; avatar_url: string | null;
  posicion: string | null; rating: number | null;
  stats: { partidos: number; goles: number; asistencias: number; atajadas: number };
  equipos: Array<{ id: string; nombre: string; rol: string }>;
}

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: player, isLoading } = useQuery<PlayerProfile>({
    queryKey: ['player', id],
    queryFn: () => apiClient.get<PlayerProfile>(`/players/${id}`),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!player) return <div className="text-center py-24 text-neutral-400">Jugador no encontrado</div>;

  const initials = (player.nombre ?? 'J').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-700">
          {player.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatar_url} alt={player.nombre ?? 'Jugador'} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">{player.nombre ?? 'Jugador sin nombre'}</h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            {player.posicion && <Badge variant="default">{player.posicion}</Badge>}
            {player.rating != null && (
              <Badge variant="primary">★ {player.rating.toFixed(1)}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader><CardTitle>Estadísticas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <StatBox label="Partidos" value={player.stats.partidos} />
            <StatBox label="Goles" value={player.stats.goles} />
            <StatBox label="Asistencias" value={player.stats.asistencias} />
            <StatBox label="Atajadas" value={player.stats.atajadas} />
          </div>
        </CardContent>
      </Card>

      {/* Equipos */}
      {player.equipos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Equipos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {player.equipos.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-neutral-800">{e.nombre}</span>
                <Badge variant={e.rol === 'capitan' ? 'primary' : 'default'}>{e.rol}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-400 mt-0.5">{label}</p>
    </div>
  );
}
