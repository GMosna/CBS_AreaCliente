// ============================================================
// SASSI IMÓVEIS — POST /api/auth/logout
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashToken, clearAuthCookies } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { verifyAccessToken } from '@/lib/verify-jwt';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // ----------------------------------------------------------
  // 1. Tentar identificar o inquilino pelo access token
  //    para registrar o log de auditoria com o ID correto
  // ----------------------------------------------------------
  let inquilinoId: string | undefined;
  const accessToken = request.cookies.get('access_token')?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    inquilinoId = payload?.id;
  }

  // ----------------------------------------------------------
  // 2. Revogar o refresh token no banco
  //    Mesmo que o access token ainda seja válido por até
  //    15 minutos, o refresh token é invalidado imediatamente,
  //    impedindo renovação da sessão.
  // ----------------------------------------------------------
  const refreshTokenRaw = request.cookies.get('refresh_token')?.value;
  if (refreshTokenRaw) {
    const tokenHash = hashToken(refreshTokenRaw);

    await supabase
      .from('refresh_tokens')
      .update({ revogado: true })
      .eq('token_hash', tokenHash)
      .eq('revogado', false);      // só atualiza se ainda estava ativo
  }

  // ----------------------------------------------------------
  // 3. Log de auditoria
  // ----------------------------------------------------------
  await logAudit('logout', request, inquilinoId);

  // ----------------------------------------------------------
  // 4. Limpar cookies e responder
  // ----------------------------------------------------------
  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookies(response);

  return response;
}
