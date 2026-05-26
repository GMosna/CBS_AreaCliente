// ============================================================
// SASSI IMÓVEIS — POST /api/auth/login
//
// Fluxo:
//  1. Valida CPF + data de nascimento no Supabase
//  2. Verifica: inquilino ativo (ativo = true)
//  3. Emite access_token (JWT 15min) + refresh_token (7 dias)
//
// ⚠️  Nunca conecta ao ERP/MySQL diretamente.
//     Os dados já estão sincronizados no Supabase via N8N.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  hashCPF,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setAuthCookies,
} from '@/lib/auth';
import { checkRateLimit, recordAttempt } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

// ============================================================
// Validação do body
// ============================================================
const loginSchema = z.object({
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(11, 'CPF deve ter 11 dígitos')),
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
});

const ERRO_AUTH = { error: 'CPF ou data de nascimento inválidos' } as const;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getClientIP(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const ip = fwd.split(',')[0].trim();
    if (/^[\d.]+$|^[0-9a-fA-F:]+$/.test(ip)) return ip;
  }
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

// ============================================================
// POST /api/auth/login
// ============================================================
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // ----------------------------------------------------------
  // 1. Parse e validação do body
  // ----------------------------------------------------------
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { cpf, dataNascimento } = parsed.data;

  // ── LOG TEMPORÁRIO DE DIAGNÓSTICO — REMOVER APÓS RESOLVER ─────
  {
    const rawCpf = (body as Record<string, unknown>).cpf;
    const rawLen = typeof rawCpf === 'string' ? rawCpf.length : -1;
    const rawHasNonDigit = typeof rawCpf === 'string' && /\D/.test(rawCpf);
    const secretRaw = process.env.CPF_SECRET_KEY ?? '';
    const secretTrimmed = secretRaw.trim();
    console.log('[DEBUG-LOGIN] CPF raw length:', rawLen, '| tem não-dígito:', rawHasNonDigit);
    console.log('[DEBUG-LOGIN] CPF sanitizado length:', cpf.length, '| primeiros 3:', cpf.substring(0, 3));
    console.log('[DEBUG-LOGIN] Data recebida:', dataNascimento);
    console.log('[DEBUG-LOGIN] CPF_SECRET_KEY length raw:', secretRaw.length, '| trimmed:', secretTrimmed.length);
    console.log('[DEBUG-LOGIN] CPF_SECRET_KEY primeiros 4 chars (hex):', Buffer.from(secretTrimmed.substring(0, 4)).toString('hex'));
  }
  // ── FIM LOG TEMPORÁRIO ─────────────────────────────────────────

  const cpfHash = hashCPF(cpf);
  console.log('[DEBUG-LOGIN] Hash gerado (primeiros 8):', cpfHash.substring(0, 8) + '...');

  // ----------------------------------------------------------
  // 2. Rate limit — bloqueia antes de qualquer consulta ao banco
  // ----------------------------------------------------------
  const { blocked, blockedUntil } = await checkRateLimit(ip);
  if (blocked) {
    await logAudit('login_bloqueado', request, undefined, { ip });
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente mais tarde.', blockedUntil: blockedUntil?.toISOString() },
      { status: 429 }
    );
  }

  // ----------------------------------------------------------
  // 3. Buscar inquilino no Supabase
  //    Valida: CPF (hash) + data de nascimento + conta ativa
  // ----------------------------------------------------------
  const supabase = getSupabase();

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id, nome, email, imovel_referencia')
    .eq('cpf', cpfHash)
    .eq('data_nascimento', dataNascimento)
    .eq('ativo', true)
    .single();

  // ----------------------------------------------------------
  // 4. Registrar tentativa (sucesso ou falha)
  // ----------------------------------------------------------
  if (!inquilino) {
    await recordAttempt(ip, cpfHash, false);
    await logAudit('login_fail', request);
    return NextResponse.json(ERRO_AUTH, { status: 401 });
  }

  await recordAttempt(ip, cpfHash, true);

  // ----------------------------------------------------------
  // 5. Gerar tokens
  // ----------------------------------------------------------
  const accessToken      = await generateAccessToken({ id: inquilino.id, role: 'inquilino' });
  const refreshToken     = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt        = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error: tokenErr } = await supabase.from('refresh_tokens').insert({
    inquilino_id: inquilino.id,
    token_hash:   refreshTokenHash,
    expires_at:   expiresAt.toISOString(),
    ip_address:   ip,
    user_agent:   request.headers.get('user-agent'),
  });

  if (tokenErr) {
    console.error('[login] Erro ao salvar refresh token:', tokenErr.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  // ----------------------------------------------------------
  // 6. Auditoria + resposta
  // ----------------------------------------------------------
  await logAudit('login_success', request, inquilino.id);

  const response = NextResponse.json(
    { nome: inquilino.nome } satisfies { nome: string },
    { status: 200 }
  );

  setAuthCookies(response, accessToken, refreshToken);
  return response;
}
