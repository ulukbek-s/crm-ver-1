import { Module } from '@nestjs/common';
import { QueueWorkerService } from './queue.worker';

@Module({
  providers: [QueueWorkerService],
})
export class WorkersModule {}
