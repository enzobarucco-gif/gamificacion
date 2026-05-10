import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { DatabaseModule } from './database/database.module.js';

// Valida variables de entorno al arrancar — falla rápido si falta algo crítico
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
    DatabaseModule,
    // Módulos de dominio — se conectan en sprints sucesivos
    // AuthModule,
    // UsersModule,
    // PlayersModule,
    // TeamsModule,
    // VenuesModule,
    // BookingsModule,
    // MatchesModule,
    // PaymentsModule,
    // ChatsModule,
    // ReviewsModule,
  ],
})
export class AppModule {}
