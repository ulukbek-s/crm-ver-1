import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    userId?: string,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        resource: entityType,
        resourceId: entityId,
        action,
        userId: userId ?? null,
        payload: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
