// ============================================================
// SASSI IMÓVEIS — Log de Auditoria
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { AuditAcao } from '@/types/auth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Extrai o IP real do cliente da requisição.
 *
 * Em ambientes como Vercel e Cloudflare, o IP real vem no
 * header X-Forwarded-For. O valor é uma lista separada por
 * vírgulas: "IP_CLIENTE, IP_PROXY_1, IP_PROXY_2"
 * O primeiro da lista é o IP original do cliente.
 *
 * Validamos com regex para evitar injeção de valores falsos
 * caso o header seja forjado (defense-in-depth).
 */
function extrairIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const primeiro = forwarded.split(',')[0].trim();
    if (isIPValido(primeiro)) return primeiro;
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP && isIPValido(realIP)) return realIP;

  // Fallback: IP desconhecido (não bloqueia o fluxo)
  return '0.0.0.0';
}

function isIPValido(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]{2,39}$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

/**
 * Insere um registro na tabela audit_logs.
 *
 * @param acao        - Ação realizada (enum do banco)
 * @param request     - Objeto Request para extrair IP e user-agent
 * @param inquilinoId - UUID do inquilino (opcional — ações pré-login não têm)
 * @param metadata    - Dados extras livres (NUNCA incluir CPF plain text)
 */
export async function logAudit(
  acao: AuditAcao,
  request: Request,
  inquilinoId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getSupabase();

    await supabase.from('audit_logs').insert({
      inquilino_id: inquilinoId ?? null,
      ip_address:   extrairIP(request),
      user_agent:   request.headers.get('user-agent'),
      acao,
      metadata:     metadata ?? null,
    });
  } catch (err) {
    // Log de auditoria nunca deve quebrar o fluxo principal
    console.error('[audit] Falha ao registrar log:', err);
  }
}
