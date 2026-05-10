import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { AuthRepository } from './auth.repository.js';
import { EmailService } from '../email/email.service.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 días
const EMAIL_VERIFY_TTL_SEC = 24 * 60 * 60;        // 24 horas
const PASSWORD_RESET_TTL_SEC = 60 * 60;            // 1 hora

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ----------------------------------------------------------------
  // Register
  // ----------------------------------------------------------------
  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException({ error: { code: 'EMAIL_TAKEN', message: 'El email ya está registrado' } });

    const hashPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const usuario = await this.repo.create({ email: dto.email, hashPassword, nombre: dto.nombre, ...(dto.telefono !== undefined && { telefono: dto.telefono }) });

    // Envía email de verificación en background
    const verifyToken = randomBytes(32).toString('hex');
    await this.redis.setex(`email_verify:${verifyToken}`, EMAIL_VERIFY_TTL_SEC, usuario.id);
    await this.email.sendEmailVerification(usuario.email, usuario.nombre, verifyToken);

    const tokens = await this.issueTokens(usuario.id, usuario.email);
    return { user: this.sanitize(usuario), tokens };
  }

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  async login(email: string, password: string) {
    const usuario = await this.repo.findByEmail(email);
    if (!usuario?.hashPassword) throw new UnauthorizedException({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } });

    const valid = await bcrypt.compare(password, usuario.hashPassword);
    if (!valid) throw new UnauthorizedException({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } });

    const tokens = await this.issueTokens(usuario.id, usuario.email);
    return { user: this.sanitize(usuario), tokens };
  }

  // ----------------------------------------------------------------
  // Refresh
  // ----------------------------------------------------------------
  async refresh(refreshToken: string) {
    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored) throw new UnauthorizedException({ error: { code: 'TOKEN_INVALID', message: 'Refresh token inválido o expirado' } });

    const { userId, email } = JSON.parse(stored) as { userId: string; email: string };
    // Rotación — invalidar el token viejo
    await this.redis.del(`refresh:${refreshToken}`);
    const tokens = await this.issueTokens(userId, email);
    return { tokens };
  }

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(`refresh:${refreshToken}`);
  }

  // ----------------------------------------------------------------
  // Email verification
  // ----------------------------------------------------------------
  async verifyEmail(token: string) {
    const userId = await this.redis.get(`email_verify:${token}`);
    if (!userId) throw new BadRequestException({ error: { code: 'TOKEN_INVALID', message: 'Token de verificación inválido o expirado' } });

    await this.repo.markEmailVerified(userId);
    await this.redis.del(`email_verify:${token}`);
    return { status: 'verified' };
  }

  // ----------------------------------------------------------------
  // Forgot / Reset password
  // ----------------------------------------------------------------
  async forgotPassword(email: string): Promise<void> {
    const usuario = await this.repo.findByEmail(email);
    // Respuesta 204 siempre — no revelar si el email existe
    if (!usuario) return;

    const token = randomBytes(32).toString('hex');
    await this.redis.setex(`pwd_reset:${token}`, PASSWORD_RESET_TTL_SEC, usuario.id);
    await this.email.sendPasswordReset(usuario.email, usuario.nombre, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.get(`pwd_reset:${token}`);
    if (!userId) throw new BadRequestException({ error: { code: 'TOKEN_INVALID', message: 'Token de reset inválido o expirado' } });

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePassword(userId, hash);
    await this.redis.del(`pwd_reset:${token}`);
  }

  // ----------------------------------------------------------------
  // Helpers privados
  // ----------------------------------------------------------------
  private async issueTokens(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = randomBytes(40).toString('hex');
    await this.redis.setex(
      `refresh:${refreshToken}`,
      REFRESH_TOKEN_TTL_SEC,
      JSON.stringify({ userId, email }),
    );

    return { access_token: accessToken, refresh_token: refreshToken, expires_in: 15 * 60 };
  }

  private sanitize(u: { id: string; email: string; nombre: string; telefono: string | null; verificadoEmail: boolean; verificadoTel: boolean; createdAt: Date }) {
    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      telefono: u.telefono,
      verificado_email: u.verificadoEmail,
      verificado_tel: u.verificadoTel,
      created_at: u.createdAt.toISOString(),
    };
  }
}
