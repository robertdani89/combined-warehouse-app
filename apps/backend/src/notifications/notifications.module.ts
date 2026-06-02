import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ClientModule } from '../client/client.module';

@Module({
  controllers: [NotificationsController],
  imports: [ClientModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule { }
