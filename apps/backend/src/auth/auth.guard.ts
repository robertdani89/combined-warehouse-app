import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Bypass public auth routes and index
    if (
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/token') ||
      path.startsWith('/auth/user-info') ||
      path.startsWith('/auth/validate-token') ||
      path === '/'
    ) {
      return true;
    }

    // Extract authorization key/token from headers
    const authHeader = request.headers['authorization'] || '';
    let key = '';
    if (authHeader.startsWith('Bearer ')) {
      key = authHeader.substring(7);
    } else {
      key = authHeader || (request.headers['x-api-key'] as string) || '';
    }

    if (!key) {
      throw new UnauthorizedException('Missing authentication key');
    }

    const isValid = await this.authService.validateKey(key);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired authentication key');
    }

    return true;
  }
}
