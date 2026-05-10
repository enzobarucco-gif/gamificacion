import { test, expect } from '@playwright/test';
import { injectAuthState, CAPITAN_A, JUGADOR } from './helpers/auth.js';

const API = 'http://localhost:3001/api/v1';

const MATCH_ID  = 'match-001';
const EQUIPO_ID = '00000000-0000-0000-0000-000000000010';

const mockMatch = {
  id: MATCH_ID,
  fecha: new Date(Date.now() + 86400000).toISOString(),
  modalidad: 'F5',
  estado: 'programado',
  estado_validacion: 'pendiente',
  equipos: [
    { equipo_id: EQUIPO_ID, nombre: 'Los Pibes del Barrio', es_local: true,  goles: 2 },
    { equipo_id: 'equipo-b', nombre: 'Estrellas del Sur',   es_local: false, goles: 1 },
  ],
  stats: [
    { jugador_id: 'j1', nombre: 'Matías Fernández', goles: 2, asistencias: 1, atajadas: 0, minutos: 60, calificacion: 9 },
    { jugador_id: 'j2', nombre: 'Lucas Gómez',      goles: 0, asistencias: 1, atajadas: 0, minutos: 60, calificacion: 7 },
  ],
  disputa: null,
};

const mockMyMatches = [mockMatch];

test.describe('Partidos — lista y detalle', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API}/matches/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMyMatches) });
    });
    await page.route(`${API}/matches/${MATCH_ID}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMatch) });
    });
  });

  test('lista de partidos muestra equipos y estado de validación', async ({ page }) => {
    await injectAuthState(page, JUGADOR);
    await page.goto('/matches');

    await expect(page.getByText('Los Pibes del Barrio')).toBeVisible();
    await expect(page.getByText('Estrellas del Sur')).toBeVisible();
    await expect(page.getByText('pendiente')).toBeVisible();
  });

  test('clic en partido abre el detalle con el marcador', async ({ page }) => {
    await injectAuthState(page, JUGADOR);
    await page.goto('/matches');

    await page.getByText('Los Pibes del Barrio').click();

    await expect(page).toHaveURL(`/matches/${MATCH_ID}`);
    await expect(page.getByText('Los Pibes del Barrio')).toBeVisible();
    await expect(page.getByText('Estrellas del Sur')).toBeVisible();
    // Marcador
    await expect(page.getByText('2 – 1')).toBeVisible();
  });

  test('detalle muestra tabla de stats de jugadores', async ({ page }) => {
    await injectAuthState(page, JUGADOR);
    await page.goto(`/matches/${MATCH_ID}`);

    await expect(page.getByText('Stats del partido')).toBeVisible();
    await expect(page.getByText('Matías Fernández')).toBeVisible();
    await expect(page.getByText('Lucas Gómez')).toBeVisible();
  });
});

test.describe('Validación de partido (capitán)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API}/matches/${MATCH_ID}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMatch) });
    });
  });

  test('capitán ve los botones de validar y disputar', async ({ page }) => {
    await injectAuthState(page, CAPITAN_A);
    await page.goto(`/matches/${MATCH_ID}`);

    await expect(page.getByText('Validar resultado')).toBeVisible();
    await expect(page.getByRole('button', { name: /confirmar resultado/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /disputar/i })).toBeVisible();
  });

  test('jugador sin rol de capitán NO ve los botones de validación', async ({ page }) => {
    await injectAuthState(page, JUGADOR);
    await page.goto(`/matches/${MATCH_ID}`);

    await expect(page.getByText('Validar resultado')).not.toBeVisible();
  });

  test('capitán confirma resultado — llama a /validate con ok=true', async ({ page }) => {
    await injectAuthState(page, CAPITAN_A);

    let validateBody: unknown;
    await page.route(`${API}/matches/${MATCH_ID}/validate`, async (route) => {
      validateBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockMatch, estado_validacion: 'parcial' }),
      });
    });

    await page.route(`${API}/matches/${MATCH_ID}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...mockMatch, estado_validacion: 'parcial' }) });
    });

    await page.goto(`/matches/${MATCH_ID}`);
    await page.getByRole('button', { name: /confirmar resultado/i }).click();

    expect(validateBody).toMatchObject({ ok: true });
  });

  test('capitán disputa — llama a /validate con ok=false', async ({ page }) => {
    await injectAuthState(page, CAPITAN_A);

    let validateBody: unknown;
    await page.route(`${API}/matches/${MATCH_ID}/validate`, async (route) => {
      validateBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockMatch, estado_validacion: 'disputa' }),
      });
    });

    await page.goto(`/matches/${MATCH_ID}`);
    await page.getByRole('button', { name: /disputar/i }).click();

    expect(validateBody).toMatchObject({ ok: false });
  });

  test('partido con disputa activa muestra card rojo', async ({ page }) => {
    await injectAuthState(page, JUGADOR);
    await page.route(`${API}/matches/${MATCH_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockMatch,
          estado_validacion: 'disputa',
          disputa: { id: 'disp-1', estado: 'abierta', motivo: 'El resultado es incorrecto' },
        }),
      });
    });

    await page.goto(`/matches/${MATCH_ID}`);
    await expect(page.getByText('El resultado es incorrecto')).toBeVisible();
    await expect(page.getByText(/disputa/i).first()).toBeVisible();
  });
});
