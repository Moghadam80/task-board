import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE } from '../../auth/auth.constants.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.[ACCESS_COOKIE];

    if (!token) {
      throw new UnauthorizedException('ورود به سیستم لازم است.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        typ: string;
        sv: number;
      }>(
        token,
        { secret: process.env.JWT_ACCESS_SECRET },
      );

      if (payload.typ !== 'access' || !payload.sub) {
        throw new UnauthorizedException('توکن دسترسی نامعتبر است.');
      }

      const user = await this.users.findActiveById(payload.sub);
      if (!user) {
        throw new UnauthorizedException(
          'کاربر غیرفعال است یا دیگر وجود ندارد.',
        );
      }
      if (!Number.isInteger(payload.sv) || payload.sv !== user.sessionVersion) {
        throw new UnauthorizedException('نشست کاربر دیگر معتبر نیست.');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('توکن دسترسی نامعتبر یا منقضی شده است.');
    }
  }
}
