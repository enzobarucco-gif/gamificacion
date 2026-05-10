import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001/api/v1';

test.describe('Flujo de autenticación', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar estado de auth antes de cada test
    await page.addInitScript(() => localStorage.removeItem('pgd-auth'));
  });

  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.route(`${API}/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'tok-access',
          refresh_token: 'tok-refresh',
          user: { sub: 'user-1', email: 'mati@pgd.dev', nombre: 'Matías', roles: [] },
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('mati@pgd.dev');
    await page.getByLabel(/contraseña/i).fill('seed1234');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL('/dashboard');
  });

  test('login con credenciales inválidas muestra error', async ({ page }) => {
    await page.route(`${API}/auth/login`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nadie@pgd.dev');
    await page.getByLabel(/contraseña/i).fill('wrongpass');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('registro crea cuenta y redirige al login', async ({ page }) => {
    await page.route(`${API}/auth/register`, async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await page.getByLabel(/nombre/i).fill('Nuevo Usuario');
    await page.getByLabel(/email/i).fill('nuevo@pgd.dev');

    // Hay dos campos de contraseña
    const pwFields = page.getByLabel(/contraseña/i);
    await pwFields.first().fill('mipass1234');
    await pwFields.last().fill('mipass1234');

    await page.getByRole('button', { name: /registrarse/i }).click();

    await expect(page).toHaveURL('/login');
  });

  test('usuario sin sesión es redirigido al login desde dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('navbar muestra botón salir cuando hay sesión activa', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pgd-auth', JSON.stringify({
        state: { accessToken: 'tok', refreshToken: 'ref', user: { sub: 'u1', email: 'mati@pgd.dev', nombre: 'Matías', roles: [] } },
        version: 0,
      }));
    });

    await page.route(`${API}/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sub: 'u1', nombre: 'Matías' }) });
    });

    await page.goto('/');
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
  });
});
