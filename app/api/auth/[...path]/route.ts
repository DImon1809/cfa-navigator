import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_BACKEND_URL ?? 'http://localhost:8080';

function extractBearer(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? match[1] : null;
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const target = `${BACKEND}/api/auth/${path.join('/')}`;

  const cookieHeader = req.headers.get('cookie');
  const headers = new Headers({ 'content-type': 'application/json' });
  if (cookieHeader) headers.set('cookie', cookieHeader);

  // Spring Security resource server reads JWT from Authorization header, not cookie
  const token = extractBearer(cookieHeader);
  if (token) headers.set('authorization', `Bearer ${token}`);

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(target, { method: req.method, headers, body });
  } catch {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
  }

  const resBody = backendRes.status === 204 ? null : await backendRes.text();
  const res = new NextResponse(resBody, {
    status: backendRes.status,
    headers: { 'content-type': backendRes.headers.get('content-type') ?? 'application/json' },
  });

  for (const cookie of backendRes.headers.getSetCookie()) {
    res.headers.append('set-cookie', cookie);
  }

  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
