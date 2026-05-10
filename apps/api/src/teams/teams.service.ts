import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { CreateTeamDto } from './dto/create-team.dto.js';
import type { UpdateTeamDto } from './dto/update-team.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

@Injectable()
export class TeamsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async getMyTeams(userId: string) {
    const miembros = await this.prisma.equipoMiembro.findMany({
      where: { jugadorId: userId, estado: { not: 'saliente' }, equipo: { deletedAt: null } },
      include: {
        equipo: {
          include: { _count: { select: { miembros: { where: { estado: 'activo' } } } } },
        },
      },
    });

    return miembros.map((m) => this.serializeTeamItem(m.equipo, m));
  }

  async create(userId: string, dto: CreateTeamDto) {
    const equipo = await this.prisma.equipo.create({
      data: {
        nombre: dto.nombre,
        ...(dto.avatar_url !== undefined && { avatarUrl: dto.avatar_url }),
        capitanId: userId,
        miembros: {
          create: { jugadorId: userId, rol: 'capitan', estado: 'activo' },
        },
      },
      include: { _count: { select: { miembros: { where: { estado: 'activo' } } } } },
    });

    // Asignar rol capitan con scope del equipo
    await this.prisma.roleAssignment.upsert({
      where: { usuarioId_rol_scopeId: { usuarioId: userId, rol: 'capitan', scopeId: equipo.id } },
      update: {},
      create: { usuarioId: userId, rol: 'capitan', scopeId: equipo.id },
    });

    return this.serializeTeam(equipo, []);
  }

  async findById(teamId: string) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id: teamId, deletedAt: null },
      include: {
        miembros: {
          where: { estado: { not: 'saliente' } },
          include: { jugador: { include: { usuario: { select: { nombre: true } } } } },
        },
        _count: { select: { miembros: { where: { estado: 'activo' } } } },
      },
    });
    if (!equipo) throw new NotFoundException({ error: { code: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' } });
    return this.serializeTeam(equipo, equipo.miembros);
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.assertCapitan(teamId, userId);
    const equipo = await this.prisma.equipo.update({
      where: { id: teamId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.avatar_url !== undefined && { avatarUrl: dto.avatar_url }),
      },
      include: { _count: { select: { miembros: { where: { estado: 'activo' } } } } },
    });
    return this.serializeTeam(equipo, []);
  }

  async invite(teamId: string, userId: string, jugadorId: string): Promise<{ id: string; equipoId: string; jugadorId: string; rol: string; estado: string; joinedAt: Date }> {
    await this.assertCapitan(teamId, userId);
    await this.assertTeamExists(teamId);

    const existing = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
    });
    if (existing && existing.estado !== 'saliente') {
      throw new ConflictException({ error: { code: 'ALREADY_MEMBER', message: 'El jugador ya es miembro del equipo' } });
    }

    if (existing) {
      return this.prisma.equipoMiembro.update({
        where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
        data: { estado: 'pendiente', rol: 'jugador' },
      });
    }

    return this.prisma.equipoMiembro.create({
      data: { equipoId: teamId, jugadorId, rol: 'jugador', estado: 'pendiente' },
    });
  }

  async join(teamId: string, userId: string): Promise<{ id: string; equipoId: string; jugadorId: string; rol: string; estado: string; joinedAt: Date }> {
    await this.assertTeamExists(teamId);

    const existing = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId: userId } },
    });
    if (existing && existing.estado !== 'saliente') {
      throw new ConflictException({ error: { code: 'ALREADY_MEMBER', message: 'Ya sos miembro de este equipo' } });
    }

    if (existing) {
      return this.prisma.equipoMiembro.update({
        where: { equipoId_jugadorId: { equipoId: teamId, jugadorId: userId } },
        data: { estado: 'pendiente' },
      });
    }

    return this.prisma.equipoMiembro.create({
      data: { equipoId: teamId, jugadorId: userId, rol: 'jugador', estado: 'pendiente' },
    });
  }

  async updateMember(teamId: string, requesterId: string, jugadorId: string, dto: UpdateMemberDto): Promise<{ id: string; equipoId: string; jugadorId: string; rol: string; estado: string; joinedAt: Date }> {
    await this.assertCapitan(teamId, requesterId);
    const member = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
    });
    if (!member) throw new NotFoundException({ error: { code: 'MEMBER_NOT_FOUND', message: 'Miembro no encontrado' } });

    const updated = await this.prisma.equipoMiembro.update({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
      data: {
        ...(dto.rol !== undefined && { rol: dto.rol }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
      },
    });
    return updated;
  }

  async removeMember(teamId: string, requesterId: string, jugadorId: string) {
    await this.assertCapitan(teamId, requesterId);
    if (requesterId === jugadorId) {
      throw new ForbiddenException({ error: { code: 'CANNOT_REMOVE_SELF', message: 'El capitán no puede removerse a sí mismo' } });
    }
    const member = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
    });
    if (!member) throw new NotFoundException({ error: { code: 'MEMBER_NOT_FOUND', message: 'Miembro no encontrado' } });

    await this.prisma.equipoMiembro.update({
      where: { equipoId_jugadorId: { equipoId: teamId, jugadorId } },
      data: { estado: 'saliente' },
    });
  }

  private async assertTeamExists(teamId: string) {
    const equipo = await this.prisma.equipo.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!equipo) throw new NotFoundException({ error: { code: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' } });
    return equipo;
  }

  private async assertCapitan(teamId: string, userId: string) {
    const equipo = await this.assertTeamExists(teamId);
    if (equipo.capitanId !== userId) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Solo el capitán puede realizar esta acción' } });
    }
  }

  private serializeTeamItem(
    equipo: { id: string; nombre: string; avatarUrl: string | null; capitanId: string | null; createdAt: Date; _count: { miembros: number } },
    membership: { rol: string; estado: string },
  ) {
    return {
      id: equipo.id,
      nombre: equipo.nombre,
      avatar_url: equipo.avatarUrl,
      capitan_id: equipo.capitanId,
      created_at: equipo.createdAt.toISOString(),
      total_activos: equipo._count.miembros,
      mi_rol: membership.rol,
      mi_estado: membership.estado,
    };
  }

  private serializeTeam(
    equipo: { id: string; nombre: string; avatarUrl: string | null; capitanId: string | null; createdAt: Date; _count: { miembros: number } },
    miembros: Array<{
      id: string;
      jugadorId: string;
      rol: string;
      estado: string;
      joinedAt: Date;
      jugador: { usuario: { nombre: string } };
    }>,
  ) {
    return {
      id: equipo.id,
      nombre: equipo.nombre,
      avatar_url: equipo.avatarUrl,
      capitan_id: equipo.capitanId,
      created_at: equipo.createdAt.toISOString(),
      total_activos: equipo._count.miembros,
      members: miembros.map((m) => ({
        jugador_id: m.jugadorId,
        nombre: m.jugador.usuario.nombre,
        rol: m.rol,
        estado: m.estado,
        joined_at: m.joinedAt.toISOString(),
      })),
    };
  }
}
