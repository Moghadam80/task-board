import {
  Injectable,
  HttpException,
  HttpStatus,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

type Bucket = { startedAt: number; count: number };

/** Process-local defense in depth. Production deployments should also rate-limit at the edge. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 15 * 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const action = request.path.endsWith('/login') ? 'login' : 'refresh';
    const limit = action === 'login' ? 10 : 30;
    // Do not trust X-Forwarded-For unless Express trust-proxy is deliberately configured.
    const source = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    // Login limits are per source + normalized account so a shared office/NAT
    // does not lock every teammate out after a handful of legitimate logins.
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : 'unknown-account';
    // Nest sits behind the same Next.js proxy for every browser, so refresh
    // buckets use the token's subject only as a bucket key (never as identity).
    // JWT signature verification still happens in AuthService.
    let refreshSubjectHint = 'no-session';
    const rawRefresh = request.cookies?.refresh_token;
    if (typeof rawRefresh === 'string') {
      try {
        const payloadSegment = rawRefresh.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as { sub?: unknown };
        if (typeof decoded.sub === 'string' && decoded.sub.length <= 100) refreshSubjectHint = decoded.sub;
      } catch {
        // Invalid tokens share the no-session bucket; this hint grants no access.
      }
    }
    const key = action === 'login'
      ? `${action}:${source}:${email}`
      : `${action}:${source}:${refreshSubjectHint}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.startedAt >= this.windowMs) {
      bucket = { startedAt: now, count: 0 };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException(
  'Too many requests',
  HttpStatus.TOO_MANY_REQUESTS,
);
    }
    // Bound memory if a large number of unique source addresses is observed.
    if (this.buckets.size > 10_000) {
      for (const [bucketKey, value] of this.buckets) {
        if (now - value.startedAt >= this.windowMs) this.buckets.delete(bucketKey);
      }
    }
    return true;
  }
}
