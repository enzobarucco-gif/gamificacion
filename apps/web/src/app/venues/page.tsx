'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Input, Badge, Spinner } from '@pgd/ui';
import { apiClient } from '../../lib/api-client';

interface VenueItem {
  id: string;
  nombre: string;
  ubicacion_name: string | null;
  rating: number;
  dist_m: number | null;
  total_campos: number | null;
}

interface VenuesResponse { items: VenueItem[]; total: number; page: number }

export default function VenuesPage() {
  const [q, setQ] = useState('');
  const [modalidad, setModalidad] = useState('');

  const { data, isLoading } = useQuery<VenuesResponse>({
    queryKey: ['venues', modalidad],
    queryFn: () => {
      const params = new URLSearchParams();
      if (modalidad) params.set('modalidad', modalidad);
      params.set('limit', '20');
      return apiClient.get<VenuesResponse>(`/venues?${params.toString()}`);
    },
  });

  const modalidades = ['F5', 'F6', 'F7', 'FUTSAL'];

  const filtered = (data?.items ?? []).filter((v) =>
    q ? v.nombre.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Buscar canchas</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Buscar por nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalidad('')}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${!modalidad ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >
            Todas
          </button>
          {modalidades.map((m) => (
            <button
              key={m}
              onClick={() => setModalidad(m === modalidad ? '' : m)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${modalidad === m ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">No se encontraron canchas</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.id}`} className="group">
              <div className="rounded-xl border border-neutral-200 bg-white p-5 hover:border-primary-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-neutral-800 group-hover:text-primary-600 line-clamp-1">
                    {venue.nombre}
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-amber-500 shrink-0 ml-2">
                    <span>★</span>
                    <span className="text-neutral-600">{venue.rating.toFixed(1)}</span>
                  </div>
                </div>
                {venue.ubicacion_name && (
                  <p className="text-sm text-neutral-400 line-clamp-1 mb-3">{venue.ubicacion_name}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {venue.total_campos !== null && (
                    <Badge variant="default">{venue.total_campos} campo{venue.total_campos !== 1 ? 's' : ''}</Badge>
                  )}
                  {venue.dist_m !== null && (
                    <Badge variant="outline">{venue.dist_m < 1000 ? `${venue.dist_m}m` : `${(venue.dist_m / 1000).toFixed(1)}km`}</Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
