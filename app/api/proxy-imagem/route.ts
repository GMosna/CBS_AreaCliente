import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = ['lh3.googleusercontent.com', 'drive.google.com'];

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) return new NextResponse(null, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const allowed = ALLOWED_HOSTS.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
  );
  if (!allowed) return new NextResponse(null, { status: 403 });

  try {
    const res = await fetch(rawUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return new NextResponse(null, { status: 502 });

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.startsWith('image/')) return new NextResponse(null, { status: 422 });

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
