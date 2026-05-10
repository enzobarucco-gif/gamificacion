import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { UsersService } from '../users/users.service.js';
import { UpdateMeDto } from '../users/dto/update-me.dto.js';

// Rate limit estricto en endpoints de auth
const AUTH_RATE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('auth/register')
  @Throttle(AUTH_RATE)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  @Throttle(AUTH_RATE)
  @ApiOperation({ summary: 'Login con email y contraseña' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidar refresh token (logout)' })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refresh_token);
  }

  @Public()
  @Post('auth/email/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar email con token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('auth/password/forgot')
  @HttpCode(204)
  @Throttle(AUTH_RATE)
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('auth/password/reset')
  @HttpCode(204)
  @ApiOperation({ summary: 'Resetear contraseña con token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.new_password);
  }

  // ---- /me endpoints ----
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<Record<string, unknown>> {
    return this.users.getMe(user.sub);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar perfil' })
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar cuenta (soft delete)' })
  async deleteMe(@CurrentUser() user: JwtPayload) {
    await this.users.deleteMe(user.sub);
  }
}
