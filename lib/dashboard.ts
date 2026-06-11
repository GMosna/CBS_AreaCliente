import { createClient } from '@supabase/supabase-js';
import { parseFrequencia, estaDisponivel } from './frequencia-desconto';
import { getParceirosAtivos } from './parceiros-cache';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Janela máxima de frequência suportada (anual + margem).
// Limitar a busca de uso_descontos a este período evita trazer todo o histórico.
const JANELA_MAX_DIAS = 370;

export async function contarBeneficiosDisponiveis(inquilinoId: string): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - JANELA_MAX_DIAS);

  const [parceiros, usosResult] = await Promise.all([
    // Parceiros vêm do cache — sem query ao banco na maioria das chamadas
    getParceirosAtivos(),
    getSupabase()
      .from('uso_descontos')
      .select('parceiro_id, usado_em')
      .eq('inquilino_id', inquilinoId)
      .gte('usado_em', cutoff.toISOString())
      .order('usado_em', { ascending: false }),
  ]);

  if (!parceiros.length) return 0;

  const usosPorParceiro = new Map<string, string[]>();
  for (const uso of (usosResult.data ?? [])) {
    const lista = usosPorParceiro.get(uso.parceiro_id) ?? [];
    lista.push(uso.usado_em);
    usosPorParceiro.set(uso.parceiro_id, lista);
  }

  let disponiveis = 0;
  for (const parceiro of parceiros) {
    const config = parseFrequencia(parceiro.frequencia_desconto);
    const timestamps = usosPorParceiro.get(parceiro.id) ?? [];
    if (estaDisponivel(config, timestamps).disponivel) disponiveis++;
  }

  return disponiveis;
}
