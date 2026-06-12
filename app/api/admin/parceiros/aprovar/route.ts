// ============================================================
// SASSI IMÓVEIS — GET /api/admin/parceiros/aprovar
//
// Aprova um parceiro via link seguro enviado por e-mail.
// O token é HMAC-SHA256(APPROVAL_SECRET, cnpj_limpo) em base64url.
// Retorna HTML para exibição direta no navegador do admin.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { criarNotificacaoGlobal } from '@/lib/notificacoes';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// exp: timestamp Unix em segundos de expiração do link
function validarToken(cnpj: string, token: string, exp: string): boolean {
  const secret = process.env.APPROVAL_SECRET;
  if (!secret) return false;

  // Verificar expiração antes de qualquer operação criptográfica
  const expNum = parseInt(exp, 10);
  if (!expNum || expNum < Math.floor(Date.now() / 1000)) return false;

  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const payload   = `${cnpjLimpo}:${exp}`;
  const esperado  = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(esperado);
    const b = Buffer.from(token);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function htmlResposta(titulo: string, mensagem: string, ok: boolean): NextResponse {
  const cor    = ok ? '#22c55e' : '#e43333';
  const icone  = ok
    ? `<svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" stroke="${cor}" stroke-width="2.5"/><path d="M17 28l8 8 14-16" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" stroke="${cor}" stroke-width="2.5"/><path d="M20 20l16 16M36 20L20 36" stroke="${cor}" stroke-width="2.5" stroke-linecap="round"/></svg>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(titulo)} — Sassi Imóveis</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#111;border:1px solid #2a2a2a;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;text-align:center}
    .icone{margin-bottom:24px}
    h1{font-size:1.5rem;font-weight:700;letter-spacing:.05em;margin-bottom:12px}
    p{color:#9ca3af;font-size:.95rem;line-height:1.6}
    .marca{margin-top:40px;font-size:.75rem;color:#3f3f3f;letter-spacing:.15em}
    .marca span{color:#e43333}
  </style>
</head>
<body>
  <div class="card">
    <div class="icone">${icone}</div>
    <h1>${esc(titulo)}</h1>
    <p>${mensagem}</p>
    <p class="marca">SASSI <span>IMÓVEIS</span></p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cnpj  = searchParams.get('cnpj')  ?? '';
  const token = searchParams.get('token') ?? '';
  const exp   = searchParams.get('exp')   ?? '';

  if (!cnpj || !token || !exp || !validarToken(cnpj, token, exp)) {
    return htmlResposta(
      'Link inválido',
      'Este link de aprovação é inválido ou foi adulterado.',
      false
    );
  }

  const cnpjLimpo = cnpj.replace(/\D/g, '');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: parceiro, error } = await supabase
    .from('parceiros')
    .update({ aprovado: true, ativo: true })
    .eq('cnpj', cnpj)
    .select('id, nome_empresa, aprovado, segmento, desconto_descricao')
    .maybeSingle();

  if (error) {
    return htmlResposta(
      'Erro interno',
      'Não foi possível aprovar o parceiro. Tente novamente mais tarde.',
      false
    );
  }

  if (!parceiro) {
    return htmlResposta(
      'Parceiro não encontrado',
      `O parceiro com CNPJ <strong>${cnpjLimpo}</strong> ainda não foi sincronizado.<br/>Aguarde até 1 hora após o cadastro e tente novamente.`,
      false
    );
  }

  // Invalidar cache para que o parceiro apareça imediatamente em todas as rotas
  revalidateTag('parceiros');
  revalidatePath('/portal/parceiros');
  revalidatePath('/portal/dashboard');

  // Notificar inquilinos (fire and forget — nunca bloqueia a resposta)
  criarNotificacaoGlobal({
    titulo:       `Novo parceiro: ${parceiro.nome_empresa}`,
    mensagem:     `${parceiro.nome_empresa} acabou de entrar para o Clube de Benefícios Sassi. Confira o desconto exclusivo para inquilinos!`,
    tipo:         'novo_parceiro',
    nomeParceiro: parceiro.nome_empresa,
    segmento:     parceiro.segmento,
    desconto:     parceiro.desconto_descricao,
  }).catch((err) => {
    console.error('[aprovar] Falha ao criar notificações:', err);
  });

  return htmlResposta(
    'Parceiro aprovado!',
    `<strong>${esc(parceiro.nome_empresa)}</strong> foi aprovado com sucesso e já está visível no Clube Sassi.`,
    true
  );
}
