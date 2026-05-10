import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { EmailModule } from './email/email.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PlayersModule } from './players/players.module.js';
import { JwtAuthGuard } from './common/guards/jwt.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
    DatabaseModule,
    RedisModule,
    EmailModule,
    AuthModule,
    UsersModule,
    PlayersModule,
    // TeamsModule,        // Sprint 3
    // VenuesModule,       // Sprint 4
    // BookingsModule,     // Sprint 5
    // MatchesModule,      // Sprint 6-7
    // PaymentsModule,     // Sprint 5-6
    // ChatsModule,        // Sprint 9
    // ReviewsModule,      // Sprint 9
  ],
  providers: [
    // Guards globales: JWT (todas las rutas) + Roles (decorador @Roles)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
