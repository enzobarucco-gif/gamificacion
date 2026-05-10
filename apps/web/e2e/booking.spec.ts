import { test, expect } from '@playwright/test';
import { injectAuthState, JUGADOR } from './helpers/auth.js';

const API = 'http://localhost:3001/api/v1';

const VENUE_ID   = 'venue-001';
const CAMPO_ID   = 'campo-001';
const SLOT_ID    = 'slot-001';
const BOOKING_ID = 'booking-001';

const mockVenue = {
  id: VENUE_ID,
  nombre: 'Complejo Palermo Sports',
  ubicacion_name: 'Palermo, Buenos Aires',
  rating: 4.8,
  campos: [{ id: CAMPO_ID, nombre: 'Campo F5', modalidad: 'F5', precio_base_cents: 800000, duracion_min: 60 }],
  resenas: [{ id: 'r1', puntaje: 5, comentario: 'Excelente', created_at: new Date().toISOString() }],
};

const mockSlots = [
  { id: SLOT_ID, inicio: new Date(Date.now() + 86400000).toISOString(), fin: new Date(Date.now() + 90000000).toISOString(), estado: 'libre', precio_cents: 800000 },
  { id: 'slot-002', inicio: new Date(Date.now() + 172800000).toISOString(), fin: new Date(Date.now() + 176400000).toISOString(), estado: 'libre', precio_cents: 800000 },
];

const mockBookingResponse = {
  reserva: { id: BOOKING_ID, slot_id: SLOT_ID, estado: 'pendiente', importe_cents: 800000, sena_cents: 240000, expires_at: new Date(Date.now() + 900000).toISOString(), created_at: new Date().toISOString() },
  pago: { id: 'pago-001', proveedor: 'mercado_pago', ext_payment_id: 'mp-ext-001', estado: 'iniciado', monto_cents: 240000 },
  checkout_url: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mp-ext-001',
};

const mockBookingDetail = {
  id: BOOKING_ID,
  slot_id: SLOT_ID,
  cancha_id: VENUE_ID,
  estado: 'pendiente',
  importe_cents: 800000,
  sena_cents: 240000,
  expires_at: new Date(Date.now() + 900000).toISOString(),
  created_at: new Date().toISOString(),
  pagos: [{ id: 'pago-001', proveedor: 'mercado_pago', estado: 'iniciado', monto_cents: 240000, ext_payment_id: 'mp-ext-001' }],
};

test.describe('Flujo de reserva de cancha', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, JUGADOR);

    await page.route(`${API}/venues`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockVenue]) });
    });
    await page.route(`${API}/venues/${VENUE_ID}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVenue) });
    });
    await page.route(`${API}/fields/${CAMPO_ID}/slots**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSlots) });
    });
    await page.route(`${API}/bookings`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(mockBookingResponse) });
      }
    });
    await page.route(`${API}/bookings/${BOOKING_ID}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockBookingDetail) });
    });
  });

  test('lista de canchas se muestra en /venues', async ({ page }) => {
    await page.goto('/venues');
    await expect(page.getByText('Complejo Palermo Sports')).toBeVisible();
    await expect(page.getByText('Palermo, Buenos Aires')).toBeVisible();
  });

  test('detalle de cancha muestra campos y slots', async ({ page }) => {
    await page.goto(`/venues/${VENUE_ID}`);

    await expect(page.getByText('Complejo Palermo Sports')).toBeVisible();
    await expect(page.getByText('Campo F5')).toBeVisible();

    // Seleccionar el campo
    await page.getByText('Campo F5').click();

    // Esperar que aparezcan los slots
    await expect(page.getByText('Turnos disponibles')).toBeVisible();
    await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible();
  });

  test('flujo completo: seleccionar slot → confirmar → ver detalle de reserva', async ({ page }) => {
    await page.goto(`/venues/${VENUE_ID}`);

    // Seleccionar campo
    await page.getByText('Campo F5').click();
    await expect(page.getByText('Turnos disponibles')).toBeVisible();

    // Seleccionar primer slot disponible
    const slots = page.locator('button').filter({ hasText: /^\d{1,2} de/ });
    await slots.first().click();

    // Confirmar reserva
    await expect(page.getByRole('button', { name: /confirmar reserva/i })).toBeVisible();
    await page.getByRole('button', { name: /confirmar reserva/i }).click();

    // Debe redirigir al detalle de la reserva con el checkout_url
    await expect(page).toHaveURL(new RegExp(`/dashboard/bookings/${BOOKING_ID}`));
    await expect(page).toHaveURL(/checkout_url/);
  });

  test('detalle de reserva muestra CTA de pago y estado', async ({ page }) => {
    const checkoutUrl = encodeURIComponent(mockBookingResponse.checkout_url);
    await page.goto(`/dashboard/bookings/${BOOKING_ID}?checkout_url=${checkoutUrl}`);

    await expect(page.getByText('Detalle de reserva')).toBeVisible();
    await expect(page.getByText('pendiente')).toBeVisible();
    await expect(page.getByRole('link', { name: /pagar ahora/i })).toBeVisible();
    await expect(page.getByText(/\$2\.400/)).toBeVisible(); // seña en ARS
  });

  test('detalle de reserva muestra botón cancelar', async ({ page }) => {
    await page.route(`${API}/bookings/${BOOKING_ID}/cancel`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...mockBookingDetail, estado: 'cancelada' }) });
    });

    await page.goto(`/dashboard/bookings/${BOOKING_ID}`);
    await expect(page.getByRole('button', { name: /cancelar reserva/i })).toBeVisible();
  });

  test('usuario sin sesión ve botón de login en venue detail', async ({ page }) => {
    // Limpiar auth para este test
    await page.addInitScript(() => localStorage.removeItem('pgd-auth'));
    await page.goto(`/venues/${VENUE_ID}`);

    await page.getByText('Campo F5').click();
    await expect(page.getByText('Turnos disponibles')).toBeVisible();

    const slots = page.locator('button').filter({ hasText: /^\d{1,2} de/ });
    await slots.first().click();

    await expect(page.getByRole('button', { name: /iniciar sesión para reservar/i })).toBeVisible();
  });
});
