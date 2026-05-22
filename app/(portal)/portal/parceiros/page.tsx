import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { ParceiroListItem } from '@/types/parceiro';
import { ParceirosClient } from './ParceirosClient';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function ParceirosPage() {
  const inquilinoId = headers().get('x-inquilino-id');
  if (!inquilinoId) return null;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('parceiros')
    .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, created_at')
    .eq('ativo', true)
    .eq('aprovado', true)
    .order('destaque', { ascending: false })
    .order('nome_empresa');

  const parceiros = (data ?? []) as ParceiroListItem[];
  const segmentos = [...new Set(parceiros.map((p) => p.segmento).filter(Boolean))] as string[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-white leading-none">
          NOSSOS <span className="text-[#e43333]">PARCEIROS</span>
        </h1>
        <p className="text-[#9ca3af] text-sm mt-1">
          {parceiros.length === 0
            ? 'Parceiros serão disponibilizados em breve'
            : `${parceiros.length} ${parceiros.length === 1 ? 'empresa parceira' : 'empresas parceiras'} com benefícios exclusivos para você`}
        </p>
      </div>

      <ParceirosClient parceiros={parceiros} segmentos={segmentos} />
    </div>
  );
}
