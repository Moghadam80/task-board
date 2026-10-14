import { NextRequest, NextResponse } from 'next/server';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-encoding',
  'content-length',
]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  // Cookie auth => defend against cross-site writes (SameSite=Lax is the first
  // layer; this is the second): a state-changing request must come from us.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        /* malformed Origin → rejected below */
      }
      if (originHost !== host) {
        return NextResponse.json(
          { statusCode: 403, message: 'درخواست از مبدأ نامعتبر ارسال شده است.' },
          { status: 403 },
        );
      }
    }
  }

  const { path } = await context.params;
  const base = process.env.BACKEND_URL;
  if (!base) {
    return NextResponse.json(
      { statusCode: 500, message: 'BACKEND_URL پیکربندی نشده است.' },
      { status: 500 },
    );
  }

  const target = new URL(
    `/api/v1/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
    base,
  );
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie' || HOP_BY_HOP.has(key.toLowerCase())) {
        return;
      }
      responseHeaders.set(key, value);
    });

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

    const cookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : [];
    for (const cookie of cookies) {
      response.headers.append('set-cookie', cookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      { statusCode: 502, message: 'سرویس پشتیبان در دسترس نیست.' },
      { status: 502 },
    );
  }
}

// No `export const dynamic = ...`: with `cacheComponents: true` route segment
// config like `dynamic` is not allowed, and route handlers are dynamic anyway.
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const PUT = proxy;
