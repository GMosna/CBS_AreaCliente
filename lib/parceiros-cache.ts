import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { ParceiroListItem } from '@/types/parceiro';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cached por 60 segundos — parceiros só mudam via sync diário ou aprovação manual.
// revalidateTag('parceiros') invalida imediatamente quando um parceiro é aprovado.
export const getParceirosAtivos = unstable_cache(
  async (): Promise<ParceiroListItem[]> => {
    const { data } = await getSupabase()
      .from('parceiros')
      .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, tipo_loja, codigo_cupom, url_loja, created_at')
      .eq('ativo', true)
      .eq('aprovado', true)
      .order('destaque', { ascending: false })
      .order('nome_empresa');
    return (data ?? []) as ParceiroListItem[];
  },
  ['parceiros-ativos'],
  { revalidate: 60, tags: ['parceiros'] }
);
