import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MatchesService } from '../matches.service.js';

const EQUIPO_A = 'equipo-a-uuid';
const EQUIPO_B = 'equipo-b-uuid';
const PARTIDO_ID = 'partido-uuid';
const CAPITAN_A = 'capitan-a-uuid';
const CAPITAN_B = 'capitan-b-uuid';

function makePartido(estadoValidacion = 'pendiente') {
  return {
    id: PARTIDO_ID,
    estado: 'programado',
    estadoValidacion,
    fecha: new Date('2025-06-01T20:00:00Z'),
    modalidad: 'F5',
    canchaId: null,
    campoId: null,
    createdAt: new Date('2025-05-01T10:00:00Z'),
    equipos: [
      { equipoId: EQUIPO_A, equipo: { id: EQUIPO_A, nombre: 'Equipo A', avatarUrl: null }, esLocal: true, goles: 2 },
      { equipoId: EQUIPO_B, equipo: { id: EQUIPO_B, nombre: 'Equipo B', avatarUrl: null }, esLocal: false, goles: 1 },
    ],
    participaciones: [],
    disputas: [],
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    partido: {
      findUnique: jest.fn().mockResolvedValue(makePartido()),
      update: jest.fn().mockResolvedValue(makePartido()),
    },
    partidoEquipo: {
      findMany: jest.fn().mockResolvedValue([
        { equipoId: EQUIPO_A, esLocal: true, goles: 2 },
        { equipoId: EQUIPO_B, esLocal: false, goles: 1 },
      ]),
      upsert: jest.fn(),
    },
    equipoMiembro: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    participacion: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    disputa: {
      create: jest.fn().mockResolvedValue({ id: 'disputa-uuid', estado: 'abierta' }),
    },
    ...overrides,
  };
}

function makeRedis(stored: Record<string, string> = {}) {
  const store: Record<string, Record<string, string>> = {};
  return {
    hset: jest.fn().mockImplementation((key: string, field: string, val: string) => {
      store[key] = { ...(store[key] ?? {}), ...stored, [field]: val };
      return Promise.resolve(1);
    }),
    hgetall: jest.fn().mockImplementation((key: string) => Promise.resolve(store[key] ?? stored)),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  };
}

function makeUser(sub: string, equipoId: string) {
  return {
    sub,
    email: 'test@test.com',
    roles: [{ rol: 'capitan', scope_id: equipoId }],
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}, redisStored: Record<string, string> = {}) {
  const prisma = makePrisma(prismaOverrides);
  const redis = makeRedis(redisStored);
  return {
    service: new MatchesService(prisma as never, redis as never),
    prisma,
    redis,
  };
}

describe('MatchesService.validate()', () => {
  it('marca disputa inmediata cuando ok=false', async () => {
    const { service, prisma } = makeService();
    // capitán A encuentra su equipo en el partido
    prisma.equipoMiembro.findFirst = jest.fn().mockResolvedValue({ equipoId: EQUIPO_A });

    await service.validate(PARTIDO_ID, makeUser(CAPITAN_A, EQUIPO_A) as never, { ok: false });

    expect(prisma.partido.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estadoValidacion: 'disputa' }) }),
    );
    expect(prisma.disputa.create).toHaveBeenCalledTimes(1);
  });

  it('queda en parcial si solo validó un equipo', async () => {
    const { service, prisma, redis } = makeService();
    prisma.equipoMiembro.findFirst = jest.fn().mockResolvedValue({ equipoId: EQUIPO_A });

    await service.validate(PARTIDO_ID, makeUser(CAPITAN_A, EQUIPO_A) as never, { ok: true });

    expect(redis.hset).toHaveBeenCalledWith(`match:validate:${PARTIDO_ID}`, EQUIPO_A, 'ok');
    expect(prisma.partido.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estadoValidacion: 'parcial' }) }),
    );
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('marca validado y limpia Redis cuando ambos equipos aceptan', async () => {
    // Redis ya tiene el voto del equipo A
    const { service, prisma, redis } = makeService(
      {},
      { [EQUIPO_A]: 'ok' }, // pre-stored
    );
    prisma.equipoMiembro.findFirst = jest.fn().mockResolvedValue({ equipoId: EQUIPO_B });

    await service.validate(PARTIDO_ID, makeUser(CAPITAN_B, EQUIPO_B) as never, { ok: true });

    expect(prisma.partido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estadoValidacion: 'validado', estado: 'jugado' }),
      }),
    );
    expect(redis.del).toHaveBeenCalledWith(`match:validate:${PARTIDO_ID}`);
  });

  it('lanza ConflictException si el partido ya fue validado', async () => {
    const { service, prisma } = makeService({
      partido: {
        findUnique: jest.fn().mockResolvedValue(makePartido('validado')),
        update: jest.fn(),
      },
    });
    prisma.equipoMiembro.findFirst = jest.fn().mockResolvedValue({ equipoId: EQUIPO_A });

    await expect(
      service.validate(PARTIDO_ID, makeUser(CAPITAN_A, EQUIPO_A) as never, { ok: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lanza ForbiddenException si el usuario no es capitán de ningún equipo del partido', async () => {
    const { service, prisma } = makeService();
    prisma.equipoMiembro.findFirst = jest.fn().mockResolvedValue(null);

    await expect(
      service.validate(PARTIDO_ID, makeUser('otro-uuid', 'equipo-ajeno') as never, { ok: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
