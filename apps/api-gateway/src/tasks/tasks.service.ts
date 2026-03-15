import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async getTasks(userId?: string, status?: string) {
    return this.prisma.task.findMany({
      where: {
        ...(status && { status }),
        ...(userId && {
          OR: [{ creatorId: userId }, { assignments: { some: { userId } } }],
        }),
      },
      include: { creator: { select: { id: true, firstName: true, lastName: true } }, assignments: { include: { user: true } } },
      orderBy: { deadline: 'asc' },
    });
  }

  async createTask(input: {
    title: string;
    description?: string;
    deadline?: string | null;
    priority?: string | null;
    creatorId?: string;
  }) {
    return this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description || null,
        status: 'todo',
        priority: input.priority || null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        creatorId: input.creatorId || null,
      },
    });
  }

  async updateTask(
    id: string,
    input: {
      title?: string;
      description?: string;
      status?: string;
      deadline?: string | null;
      priority?: string | null;
    },
  ) {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.deadline !== undefined && {
          deadline: input.deadline ? new Date(input.deadline) : null,
        }),
      },
    });
  }
}
