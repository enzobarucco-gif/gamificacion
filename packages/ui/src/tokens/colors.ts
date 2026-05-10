// Design tokens de color — PGD
// Paleta: verde primario (deporte), grises neutros, rojo destructivo

export const colors = {
  // Verde primario — acción principal, CTAs, marca
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // Grises neutros — fondo, bordes, texto secundario
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  // Rojo — acciones destructivas, errores, alertas críticas
  destructive: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  // Amarillo — advertencias, disputas
  warning: {
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
  },
  // Azul — información, badges de estado neutral
  info: {
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
  },
} as const;
