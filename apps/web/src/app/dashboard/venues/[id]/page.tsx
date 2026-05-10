'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient } from '../../../../lib/api-client';

interface Reserva {
  id: string; fecha_inicio: string; fecha_fin: string; estado: string;
  importe_cents: number; sena_cents: number;
  equipo_nombre: string | null; jugador_nombre: string | null;
}
interface KPI {
  total_slots: number; reservados: number; ingresos_cents: number;
  rating_promedio: number | null; proximas_reservas: Reserva[];
}

function fmtPrecio(c: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c / 100);
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const estadoColor: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  pagada: 'success', pendiente: 'warning', cancelada: 'destructive', no_presentado: 'destructive',
};

export default function VenueDashboardPage() {
  const { id } = useParams<{ id: string }>();

  const { data: kpi, isLoading } = useQuery<KPI>({
    queryKey: ['venue-dashboard', id],
    queryFn: () => apiClient.get<KPI>(`/venues/${id}/dashboard`),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!kpi) return <div className="text-center py-24 text-neutral-400">No se pudo cargar el dashboard</div>;

  const ocupacion = kpi.total_slots > 0 ? Math.round((kpi.reservados / kpi.total_slots) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Dashboard de cancha</h1>
        <div className="flex gap-2">
          <a
            href={`/api/v1/venues/${id}/dashboard/csv`}
            className="text-sm text-primary-600 underline hover:text-primary-800"
            target="_blank" rel="noopener noreferrer"
          >
            Exportar CSV (30 días)
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Slots totales" value={String(kpi.total_slots)} />
        <KpiCard label="Reservados" value={`${kpi.reservados} (${ocupacion}%)`} />
        <KpiCard label="Ingresos" value={fmtPrecio(kpi.ingresos_cents)} />
        <KpiCard label="Rating" value={kpi.rating_promedio != null ? kpi.rating_promedio.toFixed(1) : '–'} />
      </div>

      {/* Próximas reservas */}
      <Card>
        <CardHeader><CardTitle>Próximas reservas</CardTitle></CardHeader>
        <CardContent>
          {kpi.proximas_reservas.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">No hay reservas próximas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 text-xs uppercase">
                    <th className="text-left py-2 pr-4">Fecha</th>
                    <th className="text-left pr-4">Equipo / Jugador</th>
                    <th className="text-right pr-4">Importe</th>
                    <th className="text-right pr-4">Seña</th>
                    <th className="text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.proximas_reservas.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{fmtFecha(r.fecha_inicio)}</td>
                      <td className="pr-4 text-neutral-700">{r.equipo_nombre ?? r.jugador_nombre ?? '–'}</td>
                      <td className="text-right pr-4">{fmtPrecio(r.importe_cents)}</td>
                      <td className="text-right pr-4">{fmtPrecio(r.sena_cents)}</td>
                      <td>
                        <Badge variant={estadoColor[r.estado] ?? 'default'}>{r.estado}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5 text-center">
        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-xl font-bold text-neutral-800">{value}</p>
      </CardContent>
    </Card>
  );
}
