'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@pgd/ui';
import { apiClient, PgdApiError } from '../../../lib/api-client';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Token inválido o faltante.'); return; }
    apiClient.post('/auth/email/verify', { token })
      .then(() => setStatus('ok'))
      .catch((e) => { setStatus('error'); setMsg(e instanceof PgdApiError ? e.message : 'Error inesperado.'); });
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader><CardTitle>Verificación de email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && <><Spinner /><p className="text-sm text-neutral-500">Verificando...</p></>}
          {status === 'ok' && (
            <>
              <p className="text-4xl">✅</p>
              <p className="text-sm text-neutral-600">¡Email verificado! Ya podés iniciar sesión.</p>
              <Link href="/login"><Button className="w-full">Iniciar sesión</Button></Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-4xl">❌</p>
              <p className="text-sm text-red-600">{msg || 'El link expiró o ya fue usado.'}</p>
              <Link href="/login"><Button variant="outline" className="w-full">Volver al inicio</Button></Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
