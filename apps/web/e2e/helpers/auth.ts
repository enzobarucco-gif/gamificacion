import type { Page } from '@playwright/test';

export interface FakeUser {
  sub: string;
  email: string;
  nombre: string;
  roles: Array<{ rol: string; scope_id: string | null }>;
}

/** Inyecta tokens falsos en el store de Zustand (localStorage) para saltar el login en tests de UI. */
export async function injectAuthState(page: Page, user: FakeUser, tokens = { access: 'fake-access', refresh: 'fake-refresh' }) {
  await page.addInitScript(({ user, tokens }) => {
    const state = {
      state: {
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        user,
      },
      version: 0,
    };
    localStorage.setItem('pgd-auth', JSON.stringify(state));
  }, { user, tokens });
}

export const CAPITAN_A: FakeUser = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'mati@pgd.dev',
  nombre: 'Matías Fernández',
  roles: [
    { rol: 'jugador',  scope_id: null },
    { rol: 'capitan',  scope_id: '00000000-0000-0000-0000-000000000010' },
  ],
};

export const JUGADOR: FakeUser = {
  sub: '00000000-0000-0000-0000-000000000002',
  email: 'lucas@pgd.dev',
  nombre: 'Lucas Gómez',
  roles: [{ rol: 'jugador', scope_id: null }],
};
