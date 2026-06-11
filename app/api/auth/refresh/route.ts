// ============================================================
// SASSI IMÓVEIS — POST /api/auth/refresh
//
// Rotação de tokens: ao usar o refresh token, ele é REVOGADO
// e um novo par de tokens é emitido. Isso garante que um
// refresh token roubado só pode ser usado uma vez.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // ----------------------------------------------------------
  // 1. Ler o refresh token do cookie HttpOnly
  //    (o browser envia automaticamente porque o path bate)
  // ----------------------------------------------------------
  const refreshTokenRaw = request.cookies.get('refresh_token')?.value;

  if (!refreshTokenRaw) {
    return respostaInvalida(request, 'Refresh token ausente');
  }

  // ----------------------------------------------------------
  // 2. Calcular o hash e buscar no banco
  // ----------------------------------------------------------
  const tokenHash = hashToken(refreshTokenRaw);
  const supabase  = getSupabase();

  // ----------------------------------------------------------
  // 3. Revogar atomicamente: o UPDATE só bate se o token ainda
  //    estiver válido (revogado=false e não expirado). Se dois
  //    requests chegarem juntos, apenas um ganha o UPDATE.
  // ----------------------------------------------------------
  const { data: tokenRecord, error } = await supabase
    .from('refresh_tokens')
    .update({ revogado: true })
    .eq('token_hash', tokenHash)
    .eq('revogado', false)
    .gt('expires_at', new Date().toISOString())
    .select('id, inquilino_id, expires_at')
    .single();

  if (error || !tokenRecord) {
    return respostaInvalida(request, 'Refresh token inválido ou expirado');
  }

  // ----------------------------------------------------------
  // 4. Verificar se o inquilino ainda está ativo
  // ----------------------------------------------------------
  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id, nome, ativo')
    .eq('id', tokenRecord.inquilino_id)
    .single();

  if (!inquilino || !inquilino.ativo) {
    return respostaInvalida(request, 'Inquilino inativo');
  }

  // ----------------------------------------------------------
  // 5. Gerar novo par de tokens
  // ----------------------------------------------------------
  const novoAccessToken  = await generateAccessToken({
    id:   inquilino.id,
    role: 'inquilino',
  });
  const novoRefreshToken     = generateRefreshToken();
  const novoRefreshTokenHash = hashToken(novoRefreshToken);

  // ----------------------------------------------------------
  // 6. Salvar novo refresh token no banco
  // ----------------------------------------------------------
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await supabase.from('refresh_tokens').insert({
    inquilino_id: inquilino.id,
    token_hash:   novoRefreshTokenHash,
    expires_at:   expiresAt.toISOString(),
    ip_address:   request.headers.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0',
    user_agent:   request.headers.get('user-agent'),
  });

  // ----------------------------------------------------------
  // 7. Log de auditoria
  // ----------------------------------------------------------
  await logAudit('token_refresh', request, inquilino.id);

  // ----------------------------------------------------------
  // 8. Resposta com novos cookies
  // inquilinoId é incluído no body para que o middleware possa
  // injetar x-inquilino-id no request após o refresh silencioso.
  // O browser nunca vê este body diretamente — o middleware o consome.
  // ----------------------------------------------------------
  const response = NextResponse.json({ ok: true, inquilinoId: inquilino.id }, { status: 200 });
  setAuthCookies(response, novoAccessToken, novoRefreshToken);

  return response;
}

// ============================================================
// Helper: resposta de erro + limpeza de cookies
// Sempre que o refresh falha, limpamos os cookies para forçar
// o usuário a fazer login novamente.
// ============================================================
async function respostaInvalida(request: Request, motivo: string): Promise<NextResponse> {
  console.warn('[refresh] Token rejeitado:', motivo);

  const response = NextResponse.json(
    { error: 'Sessão expirada. Faça login novamente.' },
    { status: 401 }
  );

  clearAuthCookies(response as unknown as NextResponse);
  return response;
}
