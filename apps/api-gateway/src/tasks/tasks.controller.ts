import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  getTasks(@CurrentUser() user: JwtUser, @Query('userId') userId?: string, @Query('status') status?: string) {
    return this.tasksService.getTasks(userId ?? user?.id, status);
  }

  @Post()
  createTask(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      title: string;
      description?: string;
      deadline?: string | null;
      priority?: string | null;
    },
  ) {
    return this.tasksService.createTask({
      title: body.title,
      description: body.description,
      deadline: body.deadline ?? null,
      priority: body.priority ?? null,
      creatorId: user?.id,
    });
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: string;
      deadline?: string | null;
      priority?: string | null;
    },
  ) {
    return this.tasksService.updateTask(id, body);
  }
}
