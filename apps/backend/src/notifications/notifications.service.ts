import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async notifyIroda(userName: string): Promise<void> {
    this.logger.warn(
      `notifyIroda called for ${userName}, but websocket bridge is not implemented yet.`,
    );
  }
}
