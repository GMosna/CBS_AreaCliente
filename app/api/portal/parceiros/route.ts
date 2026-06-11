import { NextRequest, NextResponse } from 'next/server';
import { getParceirosAtivos } from '@/lib/parceiros-cache';

export async function GET(request: NextRequest) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const parceiros = await getParceirosAtivos();
  return NextResponse.json(
    { parceiros },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
