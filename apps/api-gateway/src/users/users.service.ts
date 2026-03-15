import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
        branch: true,
        managedCountries: { select: { id: true } },
        managedBranches: { select: { id: true } },
      },
    });
  }

  async create(data: { email: string; passwordHash: string; firstName: string; lastName: string }) {
    return this.prisma.user.create({
      data: {
        ...data,
        status: 'active',
      },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; userStatus?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        userRoles: { include: { role: true } },
        branch: true,
      },
    });
  }
}
