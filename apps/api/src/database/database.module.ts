import { Global, Module } from '@nestjs/common';
import { prisma } from '@pgd/db';

// Token de inyección para PrismaClient
export const PRISMA_SERVICE = 'PRISMA_SERVICE';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_SERVICE,
      useValue: prisma,
    },
  ],
  exports: [PRISMA_SERVICE],
})
export class DatabaseModule {}
