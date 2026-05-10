import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service.js';
import { AuthRepository } from '../auth.repository.js';
import { EmailService } from '../../email/email.service.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import bcrypt from 'bcrypt';

// ---- Mocks ----
const mockRepo = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  markEmailVerified: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwt = { sign: jest.fn().mockReturnValue('access.token.here') };

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('super-secret-jwt-key-at-least-32-chars'),
  get: jest.fn().mockReturnValue(undefined),
};

const mockEmail = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
};

const USER_STUB = {
  id: 'user-uuid-1',
  email: 'test@pgd.dev',
  nombre: 'Test User',
  hashPassword: '',
  telefono: null,
  verificadoEmail: false,
  verificadoTel: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // Genera hash real del password stub una vez
    USER_STUB.hashPassword = await bcrypt.hash('password123', 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('access.token.here');
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  // ---- register ----
  describe('register', () => {
    it('debe crear usuario y devolver tokens', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ ...USER_STUB, hashPassword: 'hashed' });

      const result = await service.register({ email: 'nuevo@pgd.dev', password: 'password123', nombre: 'Nuevo' });

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('tokens.access_token');
      expect(result).toHaveProperty('tokens.refresh_token');
      expect(result.user).not.toHaveProperty('hashPassword');
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      mockRepo.findByEmail.mockResolvedValue(USER_STUB);
      await expect(service.register({ email: 'test@pgd.dev', password: 'password123', nombre: 'Test' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ---- login ----
  describe('login', () => {
    it('debe retornar tokens con credenciales válidas', async () => {
      mockRepo.findByEmail.mockResolvedValue(USER_STUB);
      const result = await service.login('test@pgd.dev', 'password123');
      expect(result).toHaveProperty('tokens.access_token');
      expect(result.user.email).toBe('test@pgd.dev');
    });

    it('debe lanzar UnauthorizedException con password incorrecta', async () => {
      mockRepo.findByEmail.mockResolvedValue(USER_STUB);
      await expect(service.login('test@pgd.dev', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      await expect(service.login('noexiste@pgd.dev', 'password123')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---- refresh ----
  describe('refresh', () => {
    it('debe rotar el refresh token y emitir nuevos tokens', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'user-uuid-1', email: 'test@pgd.dev' }));
      const result = await service.refresh('valid-refresh-token');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:valid-refresh-token');
      expect(result).toHaveProperty('tokens.access_token');
    });

    it('debe lanzar UnauthorizedException si el refresh token no existe', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---- logout ----
  describe('logout', () => {
    it('debe eliminar el refresh token de Redis', async () => {
      await service.logout('some-refresh-token');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:some-refresh-token');
    });
  });

  // ---- verifyEmail ----
  describe('verifyEmail', () => {
    it('debe marcar email como verificado y borrar el token', async () => {
      mockRedis.get.mockResolvedValue('user-uuid-1');
      await service.verifyEmail('valid-email-token');
      expect(mockRepo.markEmailVerified).toHaveBeenCalledWith('user-uuid-1');
      expect(mockRedis.del).toHaveBeenCalledWith('email_verify:valid-email-token');
    });

    it('debe lanzar BadRequestException si el token es inválido', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });
  });

  // ---- forgotPassword ----
  describe('forgotPassword', () => {
    it('no debe revelar si el email existe (respuesta silenciosa)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('noexiste@pgd.dev')).resolves.toBeUndefined();
    });

    it('debe enviar email de reset si el usuario existe', async () => {
      mockRepo.findByEmail.mockResolvedValue(USER_STUB);
      await service.forgotPassword('test@pgd.dev');
      expect(mockEmail.sendPasswordReset).toHaveBeenCalledTimes(1);
    });
  });

  // ---- resetPassword ----
  describe('resetPassword', () => {
    it('debe actualizar la contraseña y borrar el token', async () => {
      mockRedis.get.mockResolvedValue('user-uuid-1');
      await service.resetPassword('valid-reset-token', 'newPassword123');
      expect(mockRepo.updatePassword).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('pwd_reset:valid-reset-token');
    });

    it('debe lanzar BadRequestException si el token es inválido', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'newPass123')).rejects.toThrow(BadRequestException);
    });
  });
});
