import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '../components/navbar';

export const metadata: Metadata = {
  title: { default: 'PGD — Plataforma de Gestión Deportiva', template: '%s | PGD' },
  description: 'Descubrí, reservá y jugá. La plataforma para el deporte amateur en Argentina.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
