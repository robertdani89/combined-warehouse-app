import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthService, TokenInfo } from './auth.service';

interface LoginRequest {
  user: string;
  pass: string;
}

interface CreateTokenRequest {
  userName: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginRequest): Promise<{ success: boolean }> {
    const success = await this.authService.login(body.user, body.pass);
    return { success };
  }

  @Post('token')
  async createToken(@Body() body: CreateTokenRequest): Promise<any> {
    const info = await this.authService.createToken(body.userName);
    return {
      new_token: info.new_token,
      new_key: info.new_key,
      expires: info.expires,
      key: info.new_key,
      token: info.new_token,
      EXPIRED: 0,
      user: body.userName,
    };
  }

  @Get('user-info')
  async getUserInfo(
    @Query('userName') userName: string,
  ): Promise<{ BECENEV: string; szemelykod: string }> {
    return this.authService.getUserInfo(userName);
  }

  @Get('validate-token/:token')
  async validateToken(
    @Param('token') token: string,
  ): Promise<{ user: string; EXPIRED: number; key: string }> {
    return this.authService.validateToken(token);
  }
}
