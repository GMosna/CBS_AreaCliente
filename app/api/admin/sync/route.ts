// ============================================================
// SASSI IMÓVEIS — POST /api/admin/sync
//
// Dispara manualmente o sync Google Sheets → PostgreSQL.
// Também chamada pelo Vercel Cron Job (vercel.json).
//
// Autenticação:
//   - Header X-Admin-Token: <ADMIN_SYNC_TOKEN>
//   - OU Header Authorization: Bearer <CRON_SECRET>  (Vercel Cron automático)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { SheetsSyncService } from '@/lib/sheets-sync';

function isAutorizado(request: NextRequest): boolean {
  // Vercel Cron: envia Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  }

  // Chamada manual/externa via X-Admin-Token
  const adminToken = process.env.ADMIN_SYNC_TOKEN;
  if (!adminToken) return false;

  const provided = request.headers.get('x-admin-token');
  if (!provided) return false;

  // timingSafeEqual para evitar timing attacks
  const expected = Buffer.from(adminToken);
  const given    = Buffer.from(provided);
  if (expected.length !== given.length) return false;

  return timingSafeEqual(expected, given);
}

export async function POST(request: NextRequest) {
  // ----------------------------------------------------------
  // 1. Autenticação
  // ----------------------------------------------------------
  if (!isAutorizado(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // ----------------------------------------------------------
  // 2. Disparar sync
  // ----------------------------------------------------------
  const service = new SheetsSyncService();
  let result;

  try {
    result = await service.syncToDatabase();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[admin/sync] Erro não tratado:', msg);
    return NextResponse.json({ error: 'Falha no sync', details: msg }, { status: 500 });
  }

  // ----------------------------------------------------------
  // 3. Relatório dos últimos syncs junto com o resultado atual
  // ----------------------------------------------------------
  let historico;
  try {
    historico = await service.getSyncReport();
  } catch {
    historico = null;
  }

  const httpStatus = result.status === 'error' ? 500 : 200;

  return NextResponse.json(
    {
      sync: result,
      historico,
    },
    { status: httpStatus }
  );
}

// GET — apenas retorna histórico (sem disparar sync)
export async function GET(request: NextRequest) {
  if (!isAutorizado(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const service = new SheetsSyncService();
    const historico = await service.getSyncReport();
    return NextResponse.json({ historico });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
