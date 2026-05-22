import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { PartnerCard } from '@/components/portal/PartnerCard';
import type { ParceiroListItem } from '@/types/parceiro';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function DashboardPage() {
  const inquilinoId = headers().get('x-inquilino-id');
  if (!inquilinoId) return null;

  const supabase = getSupabase();

  const [inquilinoRes, parceirosRes] = await Promise.all([
    supabase
      .from('inquilinos')
      .select('nome, imovel_referencia')
      .eq('id', inquilinoId)
      .single(),
    supabase
      .from('parceiros')
      .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, created_at')
      .eq('ativo', true)
      .eq('aprovado', true)
      .order('destaque', { ascending: false })
      .order('nome_empresa'),
  ]);

  const inquilino  = inquilinoRes.data;
  const parceiros  = (parceirosRes.data ?? []) as ParceiroListItem[];

  const agora     = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const totalParceiros = parceiros.length;
  const segmentos      = new Set(parceiros.map((p) => p.segmento).filter(Boolean)).size;
  const novosEsteMes   = parceiros.filter((p) => new Date(p.created_at) >= inicioMes).length;
  const destaques      = parceiros.filter((p) => p.destaque).slice(0, 4);
  const novidades      = [...parceiros]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const metricas = [
    { valor: totalParceiros, desc: 'empresas ativas',  label: 'Parceiros' },
    { valor: novosEsteMes,   desc: 'este mês',          label: 'Novos'     },
    { valor: segmentos,      desc: 'categorias',         label: 'Segmentos' },
    { valor: totalParceiros, desc: 'exclusivos',         label: 'Descontos' },
  ];

  const primeiroNome = inquilino?.nome?.split(' ')[0] ?? 'Inquilino';

  return (
    <div className="space-y-8">

      {/* Boas-vindas */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[#9ca3af] text-sm mb-1">Bem-vindo de volta</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-white leading-none">
            OLÁ, <span className="text-[#e43333]">{primeiroNome.toUpperCase()}</span>
          </h1>
          {inquilino?.imovel_referencia && (
            <div className="flex items-center gap-2 mt-3 text-[#9ca3af] text-sm">
              <svg className="w-3.5 h-3.5 text-[#e43333] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              {inquilino.imovel_referencia}
            </div>
          )}
        </div>
        <div className="hidden sm:flex w-16 h-16 bg-[#981c1c]/20 border border-[#981c1c]/30 rounded-2xl items-center justify-center shrink-0">
          <svg className="w-7 h-7 text-[#e43333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((m) => (
          <div key={m.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <p className="text-[#9ca3af] text-xs uppercase tracking-widest mb-2">{m.desc}</p>
            <p className="font-display text-5xl text-white tracking-wide leading-none">{m.valor}</p>
            <p className="text-[#6b7280] text-sm mt-2">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Destaques */}
      {destaques.length > 0 && (
        <section>
          <h2 className="font-display text-2xl tracking-wider text-white mb-4">
            PARCEIROS EM <span className="text-[#e43333]">DESTAQUE</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {destaques.map((p) => <PartnerCard key={p.id} parceiro={p} mode="featured" />)}
          </div>
        </section>
      )}

      {/* Novidades */}
      {novidades.length > 0 && (
        <section>
          <h2 className="font-display text-2xl tracking-wider text-white mb-4">
            NOVIDADES
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {novidades.map((p) => <PartnerCard key={p.id} parceiro={p} />)}
          </div>
        </section>
      )}

      {/* CTA */}
      {totalParceiros > 0 && (
        <div className="flex justify-center pt-2">
          <Link
            href="/portal/parceiros"
            className="inline-flex items-center gap-2 text-[#e43333] hover:text-[#981c1c] font-semibold text-base transition-colors group"
          >
            Ver todos os parceiros
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      )}

      {totalParceiros === 0 && (
        <div className="text-center py-20 text-[#6b7280]">
          <p className="font-display text-3xl tracking-wider mb-2 text-white">EM BREVE</p>
          <p className="text-sm">Os parceiros serão disponibilizados em breve.</p>
        </div>
      )}

    </div>
  );
}
