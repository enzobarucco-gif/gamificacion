'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth.store';

interface Member { jugador_id: string; nombre: string; rol: string; estado: string; joined_at: string }
interface TeamDetail {
  id: string; nombre: string; avatar_url: string | null; capitan_id: string | null;
  total_activos: number; members: Member[];
}

const rolColor: Record<string, 'primary' | 'default' | 'info'> = { capitan: 'primary', dt: 'info', jugador: 'default' };
const estadoColor: Record<string, 'success' | 'warning' | 'destructive'> = { activo: 'success', pendiente: 'warning', saliente: 'destructive' };

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [inviteId, setInviteId] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data: team, isLoading } = useQuery<TeamDetail>({
    queryKey: ['team', id],
    queryFn: () => apiClient.get<TeamDetail>(`/teams/${id}`),
  });

  const isCapitan = team?.capitan_id === user?.sub;

  const invite = useMutation({
    mutationFn: (jugador_id: string) => apiClient.post(`/teams/${id}/invite`, { jugador_id }),
    onSuccess: () => { setInviteId(''); qc.invalidateQueries({ queryKey: ['team', id] }); },
    onError: (e) => { if (e instanceof PgdApiError) setInviteError(e.message); },
  });

  const removeMember = useMutation({
    mutationFn: (jid: string) => apiClient.delete(`/teams/${id}/members/${jid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', id] }),
  });

  const acceptMember = useMutation({
    mutationFn: (jid: string) => apiClient.patch(`/teams/${id}/members/${jid}`, { estado: 'activo' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!team) return <div className="text-center py-24 text-neutral-400">Equipo no encontrado</div>;

  const activos = team.members.filter((m) => m.estado === 'activo');
  const pendientes = team.members.filter((m) => m.estado === 'pendiente');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
          {team.nombre[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">{team.nombre}</h1>
          <p className="text-sm text-neutral-400">{team.total_activos} miembro{team.total_activos !== 1 ? 's' : ''} activos</p>
        </div>
      </div>

      {/* Miembros pendientes (solo capitán) */}
      {isCapitan && pendientes.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader><CardTitle className="text-yellow-800 text-base">Solicitudes pendientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendientes.map((m) => (
              <div key={m.jugador_id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.nombre}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptMember.mutate(m.jugador_id)}>Aceptar</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.jugador_id)}>Rechazar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lista de miembros activos */}
      <Card>
        <CardHeader><CardTitle>Miembros</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activos.map((m) => (
            <div key={m.jugador_id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-500">
                  {m.nombre[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-neutral-800">{m.nombre}</span>
                {m.jugador_id === team.capitan_id && <span className="text-xs text-primary-500">★</span>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rolColor[m.rol] ?? 'default'}>{m.rol}</Badge>
                {isCapitan && m.jugador_id !== user?.sub && (
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-7 px-2"
                    onClick={() => removeMember.mutate(m.jugador_id)}>
                    Sacar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invitar (solo capitán) */}
      {isCapitan && (
        <Card>
          <CardHeader><CardTitle>Invitar jugador</CardTitle></CardHeader>
          <CardContent>
            {inviteError && <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{inviteError}</div>}
            <div className="flex gap-2">
              <Input
                placeholder="UUID del jugador"
                value={inviteId}
                onChange={(e) => { setInviteId(e.target.value); setInviteError(null); }}
                className="font-mono text-xs"
              />
              <Button
                onClick={() => invite.mutate(inviteId.trim())}
                disabled={!inviteId.trim() || invite.isPending}
              >
                Invitar
              </Button>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              El jugador verá la invitación y podrá aceptarla desde su perfil.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
