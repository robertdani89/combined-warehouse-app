import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ClientService } from './client.service';

interface SaveTokenRequest {
  userName: string;
  key: string;
}

interface SaveVegzesRequest {
  uid: string;
  idoString: string;
}

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('latest-version')
  async getLatestVersion(): Promise<{ latest: number }> {
    const latest = await this.clientService.getLatestVersion();
    return { latest };
  }

  @Post('gcm-id')
  async saveGcmId(@Body() body: SaveTokenRequest): Promise<{ success: boolean }> {
    await this.clientService.saveGCMId(body.userName, body.key);
    return { success: true };
  }

  @Post('firebase-token')
  async saveFirebaseToken(@Body() body: SaveTokenRequest): Promise<{ success: boolean }> {
    await this.clientService.saveFirebaseToken(body.userName, body.key);
    return { success: true };
  }

  @Get('has-vegez-ido')
  async hasVegezIdo(@Query('userName') userName: string): Promise<{ van: boolean }> {
    const van = await this.clientService.hasVegezIdo(userName);
    return { van };
  }

  @Post('save-vegzes')
  async saveVegzes(@Body() body: SaveVegzesRequest): Promise<{ success: boolean }> {
    const success = await this.clientService.saveVegzes(body.uid, body.idoString);
    return { success };
  }
}
