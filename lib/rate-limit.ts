// ============================================================
// SASSI IMÓVEIS — Rate Limiting
//
// Usa as funções PostgreSQL que criamos em functions.sql.
// Sem dependência externa: tudo vive no próprio banco.
//
// Limites:
//   - 5 tentativas por IP em janela de 10 minutos
//   - Bloqueio de 30 minutos após atingir o limite
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { RateLimitResult } from '@/types/auth';

const MAX_TENTATIVAS   = 5;
const JANELA_MINUTOS   = 10;
const BLOQUEIO_MINUTOS = 30;

export const CAPTCHA_THRESHOLD = 3;   // falhas antes de exigir CAPTCHA
const ALERT_THRESHOLD          = 50;  // falhas/hora antes de disparar webhook

/** Client com service_role para acessar tabelas protegidas pelo RLS */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Conta falhas de login de um IP na janela atual (10 min).
 * Usado para decidir se o CAPTCHA deve ser exigido antes de processar a tentativa.
 */
export async function contarFalhasIP(ip: string): Promise<number> {
  const supabase = getSupabase();
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('sucesso', false)
    .gte('created_at', desde);

  return count ?? 0;
}

/**
 * Verifica se o IP disparou o limiar de alerta (50 falhas/hora).
 * Se sim, chama o webhook configurado em SECURITY_ALERT_WEBHOOK_URL.
 * Falha silenciosamente — nunca bloqueia o fluxo de autenticação.
 */
export async function verificarAlertaSeguranca(ip: string): Promise<void> {
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const supabase = getSupabase();
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: falhasHora } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('sucesso', false)
      .gte('created_at', umaHoraAtras);

    if ((falhasHora ?? 0) < ALERT_THRESHOLD) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Alerta de Segurança — Sassi Área Cliente*\n\nIP \`${ip}\` acumulou *${falhasHora} tentativas de login falhadas* na última hora.\n\nVerifique o painel de auditoria no Supabase.`,
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Falha silenciosa — não bloquear o fluxo de autenticação
  }
}

/**
 * Verifica rapidamente se um IP está bloqueado.
 * Chamado ANTES de qualquer processamento de login para
 * rejeitar imediatamente sem tocar em dados sensíveis.
 */
export async function checkRateLimit(ip: string): Promise<{
  blocked: boolean;
  blockedUntil?: Date;
}> {
  const supabase = getSupabase();

  // Chama a função PostgreSQL que criamos em functions.sql
  const { data: bloqueado, error } = await supabase.rpc('verificar_ip_bloqueado', {
    p_ip: ip,
  });

  if (error) {
    // Em caso de erro no banco, deixa passar (fail open)
    // para não bloquear usuários legítimos por problema técnico
    console.error('[rate-limit] Erro ao verificar bloqueio:', error.message);
    return { blocked: false };
  }

  if (!bloqueado) return { blocked: false };

  // Busca quando o bloqueio termina para informar ao usuário
  const { data: tentativa } = await supabase
    .from('login_attempts')
    .select('bloqueado_ate')
    .eq('ip_address', ip)
    .gt('bloqueado_ate', new Date().toISOString())
    .order('bloqueado_ate', { ascending: false })
    .limit(1)
    .single();

  return {
    blocked: true,
    blockedUntil: tentativa?.bloqueado_ate
      ? new Date(tentativa.bloqueado_ate)
      : undefined,
  };
}

/**
 * Registra uma tentativa de login e atualiza contadores.
 * Chamado APÓS determinar se o login foi bem-sucedido.
 * Retorna o estado atualizado do rate limit.
 */
export async function recordAttempt(
  ip: string,
  cpfHash: string,
  sucesso: boolean
): Promise<RateLimitResult> {
  const supabase = getSupabase();

  // registrar_tentativa_login: função atômica que registra
  // a tentativa e calcula bloqueio em uma única operação
  const { data, error } = await supabase.rpc('registrar_tentativa_login', {
    p_ip:               ip,
    p_cpf_hash:         cpfHash,
    p_sucesso:          sucesso,
    p_max_falhas:       MAX_TENTATIVAS,
    p_janela_minutos:   JANELA_MINUTOS,
    p_bloqueio_minutos: BLOQUEIO_MINUTOS,
  });

  if (error) {
    console.error('[rate-limit] Erro ao registrar tentativa:', error.message);
    // Retorno seguro: assume que pode continuar
    return { allowed: true, remainingAttempts: 1 };
  }

  const totalFalhas: number = data.total_falhas ?? 0;

  return {
    allowed:           !data.bloqueado,
    remainingAttempts: Math.max(0, MAX_TENTATIVAS - totalFalhas),
    blockedUntil:      data.bloqueado_ate ? new Date(data.bloqueado_ate) : undefined,
  };
}
