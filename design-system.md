# Design System

## Filosofía

**Estética FIFA / PES moderna**: superficies oscuras por defecto con acentos vibrantes, gradientes sutiles, tipografía display contundente para números/títulos. Funcional, energético, no infantil.

**Densidad:** media. No minimalismo extremo (tenemos muchos datos: stats, agendas, dashboards). No ruido visual.

**Modo oscuro por defecto, modo claro disponible.**

## Design tokens

### Colores

```ts
// packages/ui/src/tokens/colors.ts
export const colors = {
  // primario — azul cancha
  primary: {
    50:  '#EBF3FF',
    100: '#D6E6FF',
    300: '#7AAEFF',
    500: '#2E7CF6',  // base
    600: '#1F5FCC',
    700: '#1648A0',
  },
  // secundario — verde/teal energético
  secondary: {
    300: '#5FE6D0',
    500: '#00C2A8',  // base
    600: '#00997F',
  },
  // semánticos
  success: '#16A34A',
  warning: '#F59E0B',
  danger:  '#DC2626',
  info:    '#3B82F6',

  // neutros (modo oscuro)
  dark: {
    bg:        '#0B0F1A',
    surface:   '#141A2B',
    surfaceHi: '#1C2438',
    border:    '#2A3349',
    text:      '#E5E7EB',
    textMuted: '#94A3B8',
  },
  // neutros (modo claro)
  light: {
    bg:        '#FFFFFF',
    surface:   '#F9FAFB',
    surfaceHi: '#F3F4F6',
    border:    '#E5E7EB',
    text:      '#101828',
    textMuted: '#64748B',
  },
} as const;
```

### Tipografía

- **Display** (títulos, números grandes en stats): `"Sora"` o `"Space Grotesk"` — peso 600/700.
- **Sans** (UI, contenido): `"Inter"` — peso 400/500/600.
- **Mono** (códigos, IDs): `"JetBrains Mono"`.

```ts
export const typography = {
  display: {
    fontFamily: '"Sora", system-ui, sans-serif',
    weights: [600, 700],
  },
  sans: {
    fontFamily: '"Inter", system-ui, sans-serif',
    weights: [400, 500, 600],
  },
  mono: {
    fontFamily: '"JetBrains Mono", monospace',
  },
  scale: {
    xs:  '12px',
    sm:  '14px',
    base:'16px',
    lg:  '18px',
    xl:  '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
};
```

**Mínimos accesibles:** texto base 14px (16 en mobile para inputs), tamaños táctiles >= 44px, contraste AA+.

### Espaciado y radio

```ts
export const spacing = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px' };
export const radius  = { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' };
```

### Sombras

```ts
export const shadows = {
  sm:  '0 2px 6px rgba(0,0,0,.08)',
  md:  '0 4px 12px rgba(0,0,0,.12)',
  lg:  '0 8px 24px rgba(0,0,0,.16)',
  // dark mode versions con alpha mayor
};
```

### Movimiento

- Microinteracciones: 150–200 ms, easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- Transiciones de página: 250 ms con fade + slide sutil.
- Loading skeletons antes que spinners.

## Componentes base (`packages/ui`)

Construidos sobre **Radix UI primitives** + **Tailwind**. Usar [shadcn/ui](https://ui.shadcn.com) como punto de partida y customizar.

| Componente | Estados | Notas |
|---|---|---|
| Button | primary / secondary / ghost / icon / danger; default / hover / focus / pressed / disabled / loading | Ripple 150 ms en primary |
| Input | default / focus / error / disabled | Label flotante opcional |
| Select / Combobox | – | Búsqueda interna |
| Checkbox / Radio / Switch | – | – |
| Card | flat / elevated; con o sin gradient sutil | Radio 16px |
| Badge | neutral / primary / success / warning / danger | Para roles, estados de partido |
| Chip | seleccionable | Para filtros (modalidad, posición) |
| Tabs | underline / pills | Para dashboards |
| Modal | – | Confirmaciones, formularios cortos |
| Drawer (mobile) | – | Reemplaza Modal en mobile |
| Toast | success / error / info / warning | Posición top-right desktop, top mobile |
| Skeleton | text / card / chart | Antes de spinners |
| Stepper | – | Onboarding, checkout |
| DataList / Table | – | Reservas, miembros |
| Calendar / SlotPicker | – | Disponibilidad de canchas |
| Charts | radar, barras apiladas, línea, heatmap | Recharts |
| Avatar | con badges (rol, rating) | – |
| EmptyState | con CTA claro | Diseñar TODOS los estados vacíos |

## Patrones críticos

### Estados vacíos (no opcional)

Cada lista que pueda estar vacía tiene diseño dedicado con CTA:

- Sin partidos → ilustración + "Armá tu primer partido" → botón.
- Sin equipo → "Creá o unite a un equipo" → dos botones.
- Sin reservas (cancha) → "Cargá tu agenda" → botón.

### Loading

- Skeletons en cards/listas.
- Optimistic UI en chat, toggles, "me uno al partido".
- Error states con guía de recuperación, no solo mensaje.

### Errores y disputas

- Color `danger` (#DC2626) reservado para acciones destructivas y errores.
- Disputas se muestran con badge naranja (`warning`) + ícono distintivo, no como error.

### Microcopy

- Tono: cercano, breve, directo. Sin "click acá".
- Argentino neutral: "vos" en CTAs ("Sumate", "Armá tu equipo"), pero sin lunfardo en textos legales o de error.
- Números siempre con separador de miles correcto: `$ 12.500` (AR).

## Layouts clave (referencia)

### Dashboard Jugador
- Sticky header con avatar + nombre + badges + CTAs primarios.
- Grid de widgets reordenables (drag&drop, persistencia por usuario):
  - Próximos partidos (lista compacta)
  - Rendimiento 30d (línea)
  - Radar de habilidades
  - Heat de actividad (90d)
  - Logros / Badges

### Dashboard Cancha
- Header sede + tabs (Agenda, Precios, Reportes, Reseñas).
- Widgets: ocupación hoy/semana, ingresos por franja, próximas reservas (con estado), NPS/reseñas recientes.

### Reserva (cancha)
- Header con foto + mapa + rating.
- Filtros de fecha/modalidad/duración.
- Calendario de slots con estados visuales (libre / reservado / bloqueado).
- Selección → resumen → checkout.
- Política de cancelación + seña SIEMPRE visibles antes de pagar.

### Partido (post)
- Marcador grande + nombres equipos.
- Tabs: stats, jugadores, chat.
- Carga de stats con auto-validación de números (no goles negativos, calificación 1-10).
- Estado `pendiente validación` muy visible, con CTA al rival.

## Iconografía

- **Lucide React** como librería primaria (consistente, open source, peso liviano).
- Custom solo cuando algo no existe (ej: cancha de futsal).
- Tamaños: 16, 20, 24px.

## Guía de imágenes

- Canchas: 16:9, 1600×900 mínimo, optimizar a WebP/AVIF.
- Avatares: cuadrados, 512×512, círculo en UI.
- Placeholders: shimmer skeleton, no imagen rota.

## Accesibilidad checklist

- [ ] Contraste AA+ en todo texto.
- [ ] `aria-label` en controles sin texto visible.
- [ ] Foco visible (no `outline: none` sin reemplazo).
- [ ] Tamaños táctiles >= 44×44 px.
- [ ] Navegable con teclado.
- [ ] Soporte screen reader probado en flujos críticos (signup, reserva, validación).
- [ ] Respeta `prefers-reduced-motion`.

## Para Claude Design / Figma

Si arrancás con Figma:

1. Crear archivo de **Foundations** con tokens (colors, typography, spacing, radius, shadows) como variables de Figma.
2. Crear archivo de **Components** con todos los componentes base como variantes.
3. Crear archivos de **Flows** por épica: Auth, Reserva, Partido, Dashboards.
4. Mantener separación: Foundations → Components → Flows. No mezclar.
5. Cuando se actualicen tokens en código, actualizar también Figma (single source of truth: el código).
