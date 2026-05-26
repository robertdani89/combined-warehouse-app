import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

interface NotifyIrodaRequest {
  userName: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('iroda')
  async notifyIroda(@Body() body: NotifyIrodaRequest): Promise<{ success: boolean }> {
    await this.notificationsService.notifyIroda(body.userName);
    return { success: true };
  }
}
