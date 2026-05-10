import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard.js';
import { ROLES_KEY } from '../../decorators/roles.decorator.js';

const makeContext = (user: unknown, handlerMeta: unknown = null, classMeta: unknown = null) => ({
  getHandler: () => ({}),
  getClass: () => ({}),
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
  _handlerMeta: handlerMeta,
  _classMeta: classMeta,
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('debe permitir acceso si no hay @Roles() definido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ sub: 'uid', email: 'a@b.com', roles: [] }) as unknown as Parameters<typeof guard.canActivate>[0];
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('debe permitir acceso si el usuario tiene el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['cancha_admin']);
    const ctx = makeContext({
      sub: 'uid',
      email: 'a@b.com',
      roles: [{ rol: 'cancha_admin', scope_id: 'cancha-uuid' }],
    }) as unknown as Parameters<typeof guard.canActivate>[0];
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['super_admin']);
    const ctx = makeContext({
      sub: 'uid',
      email: 'a@b.com',
      roles: [{ rol: 'jugador', scope_id: null }],
    }) as unknown as Parameters<typeof guard.canActivate>[0];
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException si no hay roles en el usuario', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['cancha_admin']);
    const ctx = makeContext({ sub: 'uid', email: 'a@b.com' }) as unknown as Parameters<typeof guard.canActivate>[0];
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('debe permitir si el usuario tiene cualquiera de los roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['cancha_admin', 'super_admin']);
    const ctx = makeContext({
      sub: 'uid',
      email: 'a@b.com',
      roles: [{ rol: 'cancha_admin', scope_id: 'some-id' }],
    }) as unknown as Parameters<typeof guard.canActivate>[0];
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
