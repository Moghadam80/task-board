import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordOrDummy,
} from '../common/crypto/password.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_TOKEN_TTL_SECONDS,
  COOKIE_PATH,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants.js';

const isProduction = () => process.env.NODE_ENV === 'production';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async login(email: string, password: string, response: Response) {
    const user = await this.users.findByEmailWithPassword(email);
    const passwordOk = await verifyPasswordOrDummy(
      user?.passwordHash,
      password,
    );

    if (!user || !user.isActive || !passwordOk) {
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است.');
    }

    await this.issueSession(user, response);
    return this.publicUser(user);
  }

  async refresh(rawToken: string | undefined, response: Response) {
    const user = await this.authenticateRefreshCookie(rawToken);
    await this.issueSession(user, response);
    return this.publicUser(user);
  }

  async logout(rawRefreshToken: string | undefined, response: Response, rawAccessToken?: string) {
    let revoked = false;
    if (rawRefreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<{
          sub: string;
          typ: string;
        }>(rawRefreshToken, { secret: process.env.JWT_REFRESH_SECRET });

        if (payload.typ === 'refresh' && payload.sub) {
          const user = await this.users.findByIdWithRefreshHash(payload.sub);
          const isCurrentRefreshToken =
            Boolean(user?.isActive && user.refreshTokenHash) &&
            (await verifyPassword(user!.refreshTokenHash!, rawRefreshToken));

          // Only the currently stored refresh token may revoke the session.
          // Incrementing sessionVersion immediately invalidates every access
          // token issued before logout, not just the refresh token.
          if (isCurrentRefreshToken && user) {
            await this.users.revokeSession(user.id);
            revoked = true;
          }
        }
      } catch {
        // Always clear cookies even if the refresh token is already invalid.
      }
    }

    // If refresh is missing/expired but the access token is still valid,
    // revoke that authenticated user's current session instead of merely
    // clearing browser cookies. Invalid tokens never identify a user.
    if (!revoked && rawAccessToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; typ: string; sv: number }>(
          rawAccessToken, { secret: process.env.JWT_ACCESS_SECRET },
        );
        if (payload.typ === 'access' && payload.sub && Number.isInteger(payload.sv)) {
          const user = await this.users.findActiveById(payload.sub);
          // A stale access cookie must not revoke a newer login's session.
          if (user && user.sessionVersion === payload.sv) {
            await this.users.revokeSession(user.id);
          }
        }
      } catch {
        // Invalid access tokens are ignored; logout still clears cookies.
      }
    }

    this.clearCookies(response);
    return { success: true };
  }

  async me(user: User) {
    return this.publicUser(user);
  }

  async authenticateRefreshCookie(rawToken: string | undefined): Promise<User> {
    if (!rawToken) {
      throw new UnauthorizedException('توکن نوسازی مورد نیاز است.');
    }

    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('توکن نوسازی نامعتبر یا منقضی شده است.');
    }

    const user = await this.users.findByIdWithRefreshHash(payload.sub);
    const refreshOk =
      Boolean(user?.refreshTokenHash) &&
      (await verifyPassword(user!.refreshTokenHash!, rawToken));

    if (payload.typ !== 'refresh' || !user?.isActive || !refreshOk) {
      throw new UnauthorizedException('نشست کاربر دیگر معتبر نیست.');
    }

    return user;
  }

  private async issueSession(user: User, response: Response) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'access', sv: user.sessionVersion },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        jwtid: randomUUID(),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        // unique per token: two refreshes within the same second must still
        // rotate to a *different* token (otherwise rotation would be a no-op)
        jwtid: randomUUID(),
      },
    );

    await this.users.setRefreshTokenHash(
      user.id,
      await hashPassword(refreshToken),
    );

    const common = this.cookieOptions();
    response.cookie(ACCESS_COOKIE, accessToken, {
      ...common,
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
    response.cookie(REFRESH_COOKIE, refreshToken, {
      ...common,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private clearCookies(response: Response) {
    const common = this.cookieOptions();
    response.clearCookie(ACCESS_COOKIE, common);
    response.clearCookie(REFRESH_COOKIE, common);
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      path: COOKIE_PATH,
    };
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
