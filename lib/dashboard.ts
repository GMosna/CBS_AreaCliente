import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Retorna quantos parceiros aprovados e ativos o inquilino ainda pode resgatar.
 * Por ora retorna o total de parceiros ativos — o bloqueio por frequência
 * será implementado quando o tracking de uso por período for criado.
 */
export async function contarBeneficiosDisponiveis(
  _inquilinoId: string
): Promise<number> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from('parceiros')
    .select('id', { count: 'exact', head: true })
    .eq('ativo', true)
    .eq('aprovado', true);
  return count ?? 0;
}
