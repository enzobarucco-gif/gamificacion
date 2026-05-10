'use client';

import Link from 'next/link';
import { useAuthStore } from '../stores/auth.store';
import { useLogout } from '../hooks/use-auth';
import { Button } from '@pgd/ui';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary-600 text-lg">
          PGD
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link href="/venues" className="hover:text-primary-600 transition-colors">Canchas</Link>
          {user && (
            <>
              <Link href="/dashboard" className="hover:text-primary-600 transition-colors">Mi espacio</Link>
              <Link href="/teams" className="hover:text-primary-600 transition-colors">Equipos</Link>
              <Link href="/matches" className="hover:text-primary-600 transition-colors">Partidos</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-neutral-500 truncate max-w-[140px]">
                {user.nombre ?? user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Iniciar sesión</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Registrarse</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
