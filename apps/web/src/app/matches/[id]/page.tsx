'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth.store';

interface Stat { jugador_id: string; nombre: string | null; goles: number; asistencias: number; atajadas: number; minutos: number; calificacion: number | null }
interface MatchDetail {
  id: string; fecha: string; modalidad: string; estado: string; estado_validacion: string;
  equipos: Array<{ equipo_id: string | null; nombre: string | null; es_local: boolean | null; goles: number }>;
  stats: Stat[];
  disputa: { id: string; estado: string; motivo: string | null } | null;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const valColor: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  validado: 'success', disputa: 'destructive', parcial: 'warning', pendiente: 'default',
};

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [validateError, setValidateError] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const { data: match, isLoading } = useQuery<MatchDetail>({
    queryKey: ['match', id],
    queryFn: () => apiClient.get<MatchDetail>(`/matches/${id}`),
  });

  const validate = useMutation({
    mutationFn: (ok: boolean) => apiClient.post(`/matches/${id}/validate`, { ok }),
    onSuccess: () => { setValidateError(null); qc.invalidateQueries({ queryKey: ['match', id] }); },
    onError: (e) => { if (e instanceof PgdApiError) setValidateError(e.message); },
  });

  const dispute = useMutation({
    mutationFn: (motivo: string) => apiClient.post(`/matches/${id}/disputes`, { motivo }),
    onSuccess: () => { setDisputeError(null); qc.invalidateQueries({ queryKey: ['match', id] }); },
    onError: (e) => { if (e instanceof PgdApiError) setDisputeError(e.message); },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!match) return <div className="text-center py-24 text-neutral-400">Partido no encontrado</div>;

  const isCapitan = user?.roles.some((r) => r.rol === 'capitan' &&
    match.equipos.some((e) => e.equipo_id === r.scope_id));
  const puedeValidar = isCapitan && !['validado', 'disputa'].includes(match.estado_validacion);

  const local = match.equipos.find((e) => e.es_local);
  const visitante = match.equipos.find((e) => !e.es_local);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-6 text-2xl font-bold text-neutral-800 mb-2">
          <span>{local?.nombre ?? 'Equipo A'}</span>
          <span className="text-4xl font-extrabold text-primary-600">
            {local?.goles ?? 0} – {visitante?.goles ?? 0}
          </span>
          <span>{visitante?.nombre ?? 'Equipo B'}</span>
        </div>
        <p className="text-sm text-neutral-400">{fmtFecha(match.fecha)}</p>
        <div className="flex justify-center gap-2 mt-2">
          <Badge variant="default">{match.modalidad}</Badge>
          <Badge variant={valColor[match.estado_validacion] ?? 'default'}>{match.estado_validacion}</Badge>
        </div>
      </div>

      {/* Stats */}
      {match.stats.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Stats del partido</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 text-xs uppercase">
                    <th className="text-left py-2 pr-4">Jugador</th>
                    <th className="text-center px-2">Min</th>
                    <th className="text-center px-2">G</th>
                    <th className="text-center px-2">A</th>
                    <th className="text-center px-2">Ataj</th>
                    <th className="text-center px-2">Cal</th>
                  </tr>
                </thead>
                <tbody>
                  {match.stats.map((s) => (
                    <tr key={s.jugador_id} className="border-b border-neutral-50">
                      <td className="py-2 pr-4 font-medium">{s.nombre ?? s.jugador_id.slice(0, 8)}</td>
                      <td className="text-center px-2 text-neutral-500">{s.minutos}</td>
                      <td className="text-center px-2">{s.goles}</td>
                      <td className="text-center px-2">{s.asistencias}</td>
                      <td className="text-center px-2">{s.atajadas}</td>
                      <td className="text-center px-2">{s.calificacion ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disputa activa */}
      {match.disputa && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="destructive">Disputa {match.disputa.estado}</Badge>
            </div>
            {match.disputa.motivo && <p className="text-sm text-red-700">{match.disputa.motivo}</p>}
          </CardContent>
        </Card>
      )}

      {/* Validación (capitanes) */}
      {puedeValidar && (
        <Card>
          <CardHeader><CardTitle>Validar resultado</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {validateError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{validateError}</div>}
            {disputeError && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{disputeError}</div>}
            <p className="text-sm text-neutral-500">¿El resultado refleja lo que ocurrió en el partido?</p>
            <div className="flex gap-2">
              <Button onClick={() => validate.mutate(true)} disabled={validate.isPending}>
                Confirmar resultado
              </Button>
              <Button variant="destructive" onClick={() => validate.mutate(false)} disabled={validate.isPending}>
                Disputar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
