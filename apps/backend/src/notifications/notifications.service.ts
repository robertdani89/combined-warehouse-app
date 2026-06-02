import { Injectable, Logger } from '@nestjs/common';
import { ClientService } from '../client/client.service';

type SendOptions = { title?: string; body?: string; data?: Record<string, unknown> };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly clientService: ClientService) { }

  private async sendExpoPush(token: string, opts: SendOptions): Promise<void> {
    try {
      const payload = {
        to: token,
        title: opts.title ?? 'Értesítés',
        body: opts.body ?? '',
        data: opts.data ?? {},
      };

      const res = await (global as any).fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        this.logger.warn(`Expo push failed for ${token}: ${res.status} ${txt}`);
      }
    } catch (err) {
      this.logger.error('Error sending Expo push', err as any);
    }
  }

  private async sendFcmPush(token: string, opts: SendOptions): Promise<void> {
    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      this.logger.warn('FCM_SERVER_KEY not configured; skipping FCM send');
      return;
    }

    try {
      const payload = {
        to: token,
        notification: {
          title: opts.title ?? 'Értesítés',
          body: opts.body ?? '',
        },
        data: opts.data ?? {},
      };

      const res = await (global as any).fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        this.logger.warn(`FCM push failed for ${token}: ${res.status} ${txt}`);
      }
    } catch (err) {
      this.logger.error('Error sending FCM push', err as any);
    }
  }

  async notifyIroda(userName: string, title?: string, body?: string, data?: Record<string, unknown>): Promise<void> {
    this.logger.log(`notifyIroda called for ${userName}`);
    try {
      const toks = await this.clientService.getPushTokens(userName);
      if (!toks) {
        this.logger.warn(`No push tokens found for ${userName}`);
        return;
      }

      const { firebase_token, gcm_regid } = toks;

      if (firebase_token) {
        if ((firebase_token as string).startsWith('ExponentPushToken')) {
          await this.sendExpoPush(firebase_token as string, { title, body, data });
        } else {
          await this.sendFcmPush(firebase_token as string, { title, body, data });
        }
      }

      if (gcm_regid) {
        await this.sendFcmPush(gcm_regid as string, { title, body, data });
      }
    } catch (err) {
      this.logger.error('notifyIroda failed', err as any);
    }
  }
}
