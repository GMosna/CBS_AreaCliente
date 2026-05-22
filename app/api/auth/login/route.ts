// ============================================================
// SASSI IMÓVEIS — POST /api/auth/login
//
// Fluxo:
//  1. Valida CPF + data de nascimento no ERP (MySQL)
//  2. Verifica: inquilino ativo, data_desativado IS NULL
//  3. Auto-provisiona ou atualiza no Supabase local
//  4. Emite access_token (JWT 15min) + refresh_token (7 dias)
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
import { buscarInquilinoERP } from '@/lib/erp-db';
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
  const cpfHash = hashCPF(cpf);

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
  // 3. Validar no ERP (MySQL)
  //    Confirma: CPF existe, data de nascimento correta,
  //    data_desativado IS NULL (inquilino ainda ativo)
  // ----------------------------------------------------------
  let erpInquilino;
  try {
    erpInquilino = await buscarInquilinoERP(cpf, dataNascimento);
  } catch (err) {
    // ERP inacessível — não é culpa do usuário, retorna 503
    if (err instanceof Error && err.message === 'ERP_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'Sistema temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  // ----------------------------------------------------------
  // 4. Registrar tentativa (sucesso ou falha)
  // ----------------------------------------------------------
  if (!erpInquilino) {
    await recordAttempt(ip, cpfHash, false);
    await logAudit('login_fail', request);
    return NextResponse.json(ERRO_AUTH, { status: 401 });
  }

  await recordAttempt(ip, cpfHash, true);

  // ----------------------------------------------------------
  // 5. Auto-provisionar no Supabase local
  //    Primeiro login → INSERT
  //    Logins seguintes → UPDATE nome/email/endereço do ERP
  //    O CPF é armazenado como HMAC-SHA256 (jamais em plain text)
  // ----------------------------------------------------------
  const supabase = getSupabase();

  const { data: existente } = await supabase
    .from('inquilinos')
    .select('id')
    .eq('cpf', cpfHash)
    .single();

  let inquilinoId: string;

  if (existente) {
    // Atualiza dados vindos do ERP (nome pode mudar, endereço idem)
    await supabase
      .from('inquilinos')
      .update({
        nome:              erpInquilino.nome,
        email:             erpInquilino.email,
        imovel_referencia: erpInquilino.imovel_endereco,
      })
      .eq('id', existente.id);

    inquilinoId = existente.id;
  } else {
    // Primeiro acesso — cria o registro local
    const { data: novo, error: insertErr } = await supabase
      .from('inquilinos')
      .insert({
        cpf:               cpfHash,
        nome:              erpInquilino.nome,
        email:             erpInquilino.email,
        imovel_referencia: erpInquilino.imovel_endereco,
        data_nascimento:   dataNascimento,
        ativo:             true,
      })
      .select('id')
      .single();

    if (insertErr || !novo) {
      console.error('[login] Erro ao provisionar inquilino:', insertErr?.message);
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }

    inquilinoId = novo.id;
  }

  // ----------------------------------------------------------
  // 6. Gerar tokens
  // ----------------------------------------------------------
  const accessToken      = await generateAccessToken({ id: inquilinoId, role: 'inquilino' });
  const refreshToken     = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt        = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error: tokenErr } = await supabase.from('refresh_tokens').insert({
    inquilino_id: inquilinoId,
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
  // 7. Auditoria + resposta
  // ----------------------------------------------------------
  await logAudit('login_success', request, inquilinoId);

  const response = NextResponse.json(
    { nome: erpInquilino.nome } satisfies { nome: string },
    { status: 200 }
  );

  setAuthCookies(response, accessToken, refreshToken);
  return response;
}
