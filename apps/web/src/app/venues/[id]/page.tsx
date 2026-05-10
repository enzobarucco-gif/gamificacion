'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';
import { useAuthStore } from '../../../stores/auth.store';

interface Slot { id: string; inicio: string; fin: string; estado: string; precio_cents: number | null }
interface Campo { id: string; nombre: string | null; modalidad: string; precio_base_cents: number; duracion_min: number }
interface VenueDetail {
  id: string; nombre: string; ubicacion_name: string | null; rating: number;
  campos: Campo[]; resenas: Array<{ id: string; puntaje: number | null; comentario: string | null; created_at: string }>;
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtPrecio(cents: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100);
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [selectedCampo, setSelectedCampo] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { data: venue, isLoading } = useQuery<VenueDetail>({
    queryKey: ['venue', id],
    queryFn: () => apiClient.get<VenueDetail>(`/venues/${id}`),
  });

  const fromDate = new Date();
  const toDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data: slots } = useQuery<Slot[]>({
    queryKey: ['slots', selectedCampo],
    queryFn: () =>
      apiClient.get<Slot[]>(
        `/fields/${selectedCampo}/slots?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
      ),
    enabled: !!selectedCampo,
  });

  const booking = useMutation({
    mutationFn: (slotId: string) =>
      apiClient.post<{ reserva: { id: string }; checkout_url: string }>('/bookings', {
        slot_id: slotId,
        proveedor: 'mercado_pago',
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      router.push(`/dashboard/bookings/${data.reserva.id}?checkout_url=${encodeURIComponent(data.checkout_url)}`);
    },
    onError: (err) => {
      if (err instanceof PgdApiError) setBookingError(err.message);
    },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!venue) return <div className="text-center py-24 text-neutral-400">Cancha no encontrada</div>;

  const libreSlots = (slots ?? []).filter((s) => s.estado === 'libre');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-neutral-800">{venue.nombre}</h1>
          <div className="flex items-center gap-1 text-amber-500">
            <span className="text-lg">★</span>
            <span className="text-neutral-700 font-medium">{venue.rating.toFixed(1)}</span>
          </div>
        </div>
        {venue.ubicacion_name && <p className="mt-1 text-neutral-500">{venue.ubicacion_name}</p>}
      </div>

      {/* Campos */}
      <Card>
        <CardHeader><CardTitle>Campos disponibles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {venue.campos.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCampo(c.id); setSelectedSlot(null); }}
                className={`rounded-lg border px-4 py-3 text-left transition-all ${selectedCampo === c.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-primary-300'}`}
              >
                <div className="font-medium text-sm">{c.nombre ?? `Campo ${c.modalidad}`}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {c.modalidad} · {fmtPrecio(c.precio_base_cents)} / {c.duracion_min}min
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slots */}
      {selectedCampo && (
        <Card>
          <CardHeader><CardTitle>Turnos disponibles — próximos 7 días</CardTitle></CardHeader>
          <CardContent>
            {bookingError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {bookingError}
              </div>
            )}
            {libreSlots.length === 0 ? (
              <p className="text-neutral-400 text-sm">No hay turnos disponibles para este campo</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {libreSlots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSlot(s.id === selectedSlot ? null : s.id)}
                    className={`rounded-lg border px-4 py-3 text-left transition-all ${selectedSlot === s.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-primary-300'}`}
                  >
                    <div className="font-medium text-sm">{fmtFecha(s.inicio)}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {fmtHora(s.inicio)} – {fmtHora(s.fin)}
                      {s.precio_cents !== null && ` · ${fmtPrecio(s.precio_cents)}`}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-4 flex items-center gap-3">
                {user ? (
                  <Button
                    onClick={() => { setBookingError(null); booking.mutate(selectedSlot); }}
                    disabled={booking.isPending}
                  >
                    {booking.isPending ? 'Reservando...' : 'Confirmar reserva'}
                  </Button>
                ) : (
                  <Button onClick={() => router.push('/login')}>
                    Iniciar sesión para reservar
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedSlot(null)}>Cancelar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reseñas */}
      {venue.resenas.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Reseñas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {venue.resenas.map((r) => (
              <div key={r.id} className="border-b border-neutral-100 pb-3 last:border-0">
                <div className="flex items-center gap-1 text-amber-500 mb-1">
                  {Array.from({ length: r.puntaje ?? 0 }).map((_, i) => <span key={i}>★</span>)}
                  {Array.from({ length: 5 - (r.puntaje ?? 0) }).map((_, i) => <span key={i} className="text-neutral-200">★</span>)}
                </div>
                {r.comentario && <p className="text-sm text-neutral-600">{r.comentario}</p>}
                <p className="text-xs text-neutral-400 mt-1">{fmtFecha(r.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
