import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async getMe(userId: string): Promise<Record<string, unknown>> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roleAssignments: true, jugador: true },
    });
    if (!usuario) throw new NotFoundException({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      verificado_email: usuario.verificadoEmail,
      verificado_tel: usuario.verificadoTel,
      created_at: usuario.createdAt.toISOString(),
      roles: usuario.roleAssignments.map((r) => ({ rol: r.rol, scope_id: r.scopeId })),
      jugador: usuario.jugador
        ? {
            posicion: usuario.jugador.posicion,
            pie_habil: usuario.jugador.pieHabil,
            privacidad: usuario.jugador.privacidad,
            rating_actual: Number(usuario.jugador.ratingActual),
            foto_url: usuario.jugador.fotoUrl,
          }
        : null,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const usuario = await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
      },
    });
    return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, telefono: usuario.telefono };
  }

  async deleteMe(userId: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }
}
