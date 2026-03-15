import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('communications')
@UseGuards(AuthGuard('jwt'))
export class CommunicationsController {
  constructor(private prisma: PrismaService) {}

  @Get('messages')
  async getMessages() {
    return this.prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}

