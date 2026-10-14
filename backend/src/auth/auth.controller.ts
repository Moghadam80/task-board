import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard.js';
import type { User } from '../users/user.entity.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth.constants.js';
import { LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(dto.email, dto.password, response);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.refresh(request.cookies?.[REFRESH_COOKIE], response);
  }

  @Post('logout')
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.logout(request.cookies?.[REFRESH_COOKIE], response, request.cookies?.[ACCESS_COOKIE]);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.auth.me(user);
  }
}
