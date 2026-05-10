import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient, Usuario } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';

@Injectable()
export class AuthRepository {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: {
    email: string;
    hashPassword: string;
    nombre: string;
    telefono?: string;
  }): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: {
        email: data.email.toLowerCase(),
        hashPassword: data.hashPassword,
        nombre: data.nombre,
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        jugador: { create: { disponibilidad: {}, privacidad: 'publico' } },
        roleAssignments: { create: { rol: 'jugador' } },
      },
    });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { verificadoEmail: true } });
  }

  async updatePassword(id: string, hashPassword: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { hashPassword } });
  }
}
