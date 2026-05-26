import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { TasksService } from './tasks.service';

@Module({
  imports: [MessagesModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
