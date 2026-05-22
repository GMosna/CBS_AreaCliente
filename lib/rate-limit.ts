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

const MAX_TENTATIVAS  = 5;
const JANELA_MINUTOS  = 10;
const BLOQUEIO_MINUTOS = 30;

/** Client com service_role para acessar tabelas protegidas pelo RLS */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
