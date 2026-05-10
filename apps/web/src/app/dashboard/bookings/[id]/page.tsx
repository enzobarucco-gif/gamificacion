'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../../lib/api-client';
import { useState } from 'react';

interface Pago { id: string; proveedor: string; estado: string; monto_cents: number; ext_payment_id: string | null }
interface BookingDetail {
  id: string; slot_id: string | null; cancha_id: string | null; estado: string;
  importe_cents: number; sena_cents: number; expires_at: string | null; created_at: string;
  pagos: Pago[];
}

function fmtPrecio(c: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(c / 100);
}

const estadoColor: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  pagada: 'success', pendiente: 'warning', cancelada: 'destructive', no_presentado: 'destructive',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const checkoutUrl = params.get('checkout_url');
  const router = useRouter();
  const qc = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ['booking', id],
    queryFn: () => apiClient.get<BookingDetail>(`/bookings/${id}`),
  });

  const cancel = useMutation({
    mutationFn: () => apiClient.patch(`/bookings/${id}/cancel`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking', id] }); qc.invalidateQueries({ queryKey: ['my-bookings'] }); },
    onError: (e) => { if (e instanceof PgdApiError) setCancelError(e.message); },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!booking) return <div className="text-center py-24 text-neutral-400">Reserva no encontrada</div>;

  const expiresAt = booking.expires_at ? new Date(booking.expires_at) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-800">Detalle de reserva</h1>
        <Badge variant={estadoColor[booking.estado] ?? 'default'}>{booking.estado}</Badge>
      </div>

      {/* Checkout pendiente */}
      {booking.estado === 'pendiente' && checkoutUrl && !isExpired && (
        <Card className="border-primary-200 bg-primary-50">
          <CardContent className="py-5 text-center space-y-3">
            <p className="text-sm font-medium text-primary-800">Tu reserva está pendiente de pago</p>
            {expiresAt && (
              <p className="text-xs text-primary-600">Expira: {expiresAt.toLocaleString('es-AR')}</p>
            )}
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">Pagar ahora</Button>
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Información</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Importe total" value={fmtPrecio(booking.importe_cents)} />
          <Row label="Seña" value={fmtPrecio(booking.sena_cents)} />
          <Row label="Creada" value={new Date(booking.created_at).toLocaleString('es-AR')} />
          {expiresAt && <Row label="Expira" value={expiresAt.toLocaleString('es-AR')} />}
        </CardContent>
      </Card>

      {booking.pagos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pagos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {booking.pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-neutral-50 last:border-0">
                <div>
                  <span className="font-medium">{p.proveedor}</span>
                  {p.ext_payment_id && <span className="ml-2 text-xs text-neutral-400 font-mono">{p.ext_payment_id.slice(0, 8)}…</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span>{fmtPrecio(p.monto_cents)}</span>
                  <Badge variant={p.estado === 'aprobado' ? 'success' : p.estado === 'iniciado' ? 'warning' : 'destructive'}>
                    {p.estado}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        {['pendiente', 'pagada'].includes(booking.estado) && (
          <>
            {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
            <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelando...' : 'Cancelar reserva'}
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>Volver</Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
