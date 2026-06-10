import { createClient } from '@supabase/supabase-js';
import { parseFrequencia, estaDisponivel } from './frequencia-desconto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Retorna quantos parceiros o inquilino ainda pode resgatar,
 * respeitando a frequência de uso de cada um.
 * Usa 2 queries em vez de N+1.
 */
export async function contarBeneficiosDisponiveis(inquilinoId: string): Promise<number> {
  const supabase = getSupabase();

  // 1. Todos os parceiros ativos e aprovados
  const { data: parceiros } = await supabase
    .from('parceiros')
    .select('id, frequencia_desconto')
    .eq('ativo', true)
    .eq('aprovado', true);

  if (!parceiros || parceiros.length === 0) return 0;

  // 2. Todos os usos do inquilino de uma vez (sem filtro de data — estaDisponivel filtra)
  const { data: usos } = await supabase
    .from('uso_descontos')
    .select('parceiro_id, usado_em')
    .eq('inquilino_id', inquilinoId)
    .order('usado_em', { ascending: false });

  // Agrupar timestamps por parceiro
  const usosPorParceiro = new Map<string, string[]>();
  for (const uso of (usos ?? [])) {
    const lista = usosPorParceiro.get(uso.parceiro_id) ?? [];
    lista.push(uso.usado_em);
    usosPorParceiro.set(uso.parceiro_id, lista);
  }

  let disponiveis = 0;
  for (const parceiro of parceiros) {
    const config = parseFrequencia(parceiro.frequencia_desconto);
    const timestamps = usosPorParceiro.get(parceiro.id) ?? [];
    const result = estaDisponivel(config, timestamps);
    if (result.disponivel) disponiveis++;
  }

  return disponiveis;
}
