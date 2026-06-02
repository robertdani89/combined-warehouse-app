import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

interface NotifyIrodaRequest {
  userName: string;
}

interface SendNotificationRequest {
  userName: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post('iroda')
  async notifyIroda(@Body() body: NotifyIrodaRequest): Promise<{ success: boolean }> {
    await this.notificationsService.notifyIroda(body.userName);
    return { success: true };
  }

  @Post('send')
  async sendNotification(@Body() body: SendNotificationRequest): Promise<{ success: boolean }> {
    await this.notificationsService.notifyIroda(body.userName, body.title, body.body, body.data);
    return { success: true };
  }
}
