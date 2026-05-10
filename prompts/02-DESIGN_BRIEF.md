# Design Brief — PGD User MVP

> Este brief sirve para arrancar el trabajo de UI/UX en Figma (manual o asistido por IA), o para usar Claude en modo "diseño" generando mocks/artifacts. La fuente canónica del design system es `docs/05-DESIGN_SYSTEM.md`.

---

## Contexto del producto

**PGD** es una plataforma para fútbol amateur en Argentina (F5/F6/F7, futsal). Conecta tres actores:

- **Jugadores** que quieren conseguir partidos, ver progreso, jugar más.
- **Capitanes / DTs** que arman partidos y necesitan reservar canchas y confirmar gente.
- **Dueños de canchas** que quieren llenar la agenda y cobrar sin fricción.

**Posicionamiento estético:** moderno tipo FIFA / EA Sports — energético, orientado a stats y comunidad, no infantil. Modo oscuro por default.

**No es:** un Tinder, un WhatsApp, un Excel. Tampoco un Playtomic clonado.

---

## Objetivos del diseño

1. **Reducir fricción operativa** en el ciclo Reservar → Pagar → Confirmar plantel → Jugar → Cargar stats → Validar → Reseñar.
2. **Aumentar adherencia** mostrando progreso (radar, rendimiento, badges, rankings).
3. **Generar comunidad** sin volverse otro WhatsApp ruidoso.
4. **Habilitar a las canchas** con una herramienta simple para gestionar agenda y ver sus números.

## North Star de UX

El usuario completa su **primer partido + primera reseña en 7 días desde signup**. Todo el onboarding, los CTAs y los empty states tienen que empujar hacia ese hito.

---

## Foundations (tokens)

Ver `docs/05-DESIGN_SYSTEM.md` para el listado completo. Resumen:

- **Color primario:** azul cancha `#2E7CF6` (modo claro) / `#5C9BFF` (modo oscuro).
- **Color secundario:** teal `#00C2A8`.
- **Tipografía:** Sora / Space Grotesk para display, Inter para UI.
- **Radio:** 12–16 px en cards.
- **Sombra:** suave (4–8 px), elevación clara entre superficies.
- **Movimiento:** 150–200 ms en microinteracciones.
- **Modo oscuro por default**, modo claro disponible.

---

## Pantallas a diseñar (orden de prioridad)

### Tier 1 — Críticas para el MVP (semana 1 de diseño)

1. **Onboarding** (signup → verificación → completar perfil → primer partido)
2. **Catálogo de canchas** (mapa + lista, filtros, ficha)
3. **Slot picker** (calendario de disponibilidad, selección, resumen)
4. **Checkout** (resumen + pago, estados de éxito/error/pendiente)
5. **Crear partido** (vs equipo / pickup, plantel, confirmaciones)
6. **Carga y validación de stats** (post-partido)
7. **Dashboard Jugador** (próximos, rendimiento, radar, heat, badges)
8. **Dashboard Cancha** (ocupación, ingresos, próximas, NPS)

### Tier 2 — Importantes pero post-críticas (semana 2)

9. **Equipos** (mi equipo, invitaciones, miembros)
10. **Chat** (de partido y de equipo)
11. **Reseñas** (lista y formulario)
12. **Admin Cancha** — agenda, precios, políticas
13. **Perfil + Privacidad**
14. **Estados de error y disputa** (todos los flujos)

### Tier 3 — Detalles que importan

15. **Empty states** de cada lista (sin partidos, sin equipo, sin reservas).
16. **Skeletons** de cada vista con datos.
17. **Notificaciones** (push + in-app).
18. **Landing pública** (pre-login).

---

## Flujos clave (happy paths)

### A. Jugador — primer partido en 7 días

```
Signup (email/SMS) →
Verificación →
Onboarding: posición, pie hábil, disponibilidad →
Sugerencia: unirse a un equipo / armar uno →
Ve catálogo de canchas cercanas →
Elige slot → Reserva con seña →
Confirma plantel → Juega →
Carga stats → Valida → Reseña la cancha →
Dashboard se actualiza con su primer partido
```

### B. Capitán — armar partido vs otro equipo

```
Crea partido → Invita equipo rival →
Reserva slot y paga seña (split o solo) →
Notifica a su equipo →
Recibe confirmaciones →
Post-partido: carga resultado + stats →
Confirma validación del rival →
Si discrepan → abre disputa
```

### C. Dueño de cancha — onboarding y operación

```
Alta de sede → Configura campos (modalidad, precio base) →
Crea agenda en bulk (próximos 30 días, horarios típicos) →
Define política de cancelación + seña requerida →
Recibe primera reserva → Cobra automático →
Ve dashboard: ocupación de la semana, ingresos →
Responde reseñas
```

---

## Patrones a respetar

- **Optimistic UI** en acciones rápidas (me uno al partido, marco asistencia, envío mensaje).
- **Skeletons antes que spinners** en cargas de listas y dashboards.
- **Empty states con CTA siempre.** Ninguna pantalla "muerta".
- **Estados de error con guía de recuperación**, no solo "Error 500".
- **Confirmaciones destructivas** (cancelar reserva, eliminar equipo) con doble paso.
- **Mobile-first.** Probablemente >70% del uso será mobile. PWA, no nativa al inicio.
- **Accesibilidad AA+**: contraste, tamaños táctiles ≥44px, foco visible, screen reader friendly.

---

## Cosas a evitar

- **Bloat de gamificación.** Sí badges y rachas, no popups cada 5 segundos.
- **Demasiados colores semánticos al mismo tiempo.** Una pantalla con verde + amarillo + rojo + azul + violeta es ruido.
- **Estilo "infantil"** (degradés saturados de neón, emojis everywhere, ilustraciones tipo Notion). El target es 18-45, ambición competitiva.
- **Notificaciones agresivas.** Default conservador, opt-in para más.
- **Replicar el feel de WhatsApp** en el chat. Es para coordinar, no para chatear todo el día.

---

## Referencias visuales sugeridas

- **EA Sports FC / FIFA app companion** — stats, radar, ratings.
- **Strava** — rendimiento personal + social light.
- **Linear** — densidad de información sin sentirse ruidosa.
- **Notion (modo oscuro)** — superficies y elevaciones.
- **Playtomic / CeleBreak** — para entender el espacio competitivo (qué hacen bien y qué evitar).

---

## Entregables esperados

1. **Foundations** (Figma file): variables de color, tipografía, espaciado, radio, sombras, en modo claro y oscuro.
2. **Component library** (Figma file): todos los componentes de la sección "Componentes base" con sus variantes y estados.
3. **Flows por épica** (Figma files): un archivo por flujo principal (Auth, Reserva, Partido, Dashboards).
4. **Specs de hand-off**: medidas, comportamiento, animaciones, datos en cada componente.
5. **Prototipo navegable** del happy path A (jugador → primer partido) para mostrar a stakeholders y validación con dueños de canchas.

---

## Validación con usuarios (antes de codear)

Una vez que el prototipo navegable esté listo, hacer **5–10 entrevistas con dueños de canchas** y **5–10 con jugadores/capitanes**. Preguntas clave:

**Para canchas:**
- ¿Qué usás hoy para gestionar reservas? ¿Qué te frustra?
- ¿Cobrás seña digital? Si sí, ¿con qué herramienta?
- **Si la plataforma cobra una comisión por reserva, ¿cómo lo manejarías para pagos en efectivo en cancha?**
- ¿Qué reportes te servirían más?

**Para jugadores/capitanes:**
- ¿Cómo armás un partido hoy? ¿Cuánto tiempo te lleva?
- ¿Qué tan confiables son las stats que se cargan en grupos de WhatsApp?
- ¿Pagarías una seña digital? ¿Cuánto?
- ¿Qué te haría volver a usar la app la semana siguiente?

---

## Cuándo trabajar con Claude (asistente de diseño)

Claude puede ayudar acá con:

- **Generar mockups en HTML/React** dentro de un artifact para iterar ideas rápido (antes de Figma).
- **Escribir microcopy** alternativo (CTAs, empty states, errores).
- **Revisar consistencia de tokens** entre pantallas.
- **Auditar accesibilidad** sobre screenshots o código.
- **Generar variantes** de un componente para evaluar opciones.

No reemplaza Figma para hand-off ni para colaboración, pero acelera la fase de exploración.

**Ejemplo de prompt útil:**
> "Atlas, generá un artifact en React con 3 variantes del componente 'tarjeta de partido próximo' usando los tokens de docs/05-DESIGN_SYSTEM.md. Variante A minimalista, B densa con stats, C con countdown grande. Modo oscuro."
