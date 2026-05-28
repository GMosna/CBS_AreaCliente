import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ParceiroDb } from '@/types/parceiro';
import { ParceiroDetalheActions } from './ParceiroDetalheActions';
import { resolveLogoUrl } from '@/utils/logo';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParceiroDetalhePage({ params }: Props) {
  const { id } = await params;
  const inquilinoId = (await headers()).get('x-inquilino-id');
  if (!inquilinoId) return null;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('parceiros')
    .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, endereco, created_at')
    .eq('id', id)
    .eq('ativo', true)
    .eq('aprovado', true)
    .single();

  if (!data) notFound();

  const parceiro = data as Pick<ParceiroDb, 'id' | 'nome_empresa' | 'segmento' | 'desconto_descricao' | 'frequencia_desconto' | 'logo_url' | 'destaque' | 'whatsapp' | 'endereco' | 'created_at'>;
  const inicial = parceiro.nome_empresa.charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back */}
      <Link
        href="/portal/parceiros"
        className="inline-flex items-center gap-2 text-[#9ca3af] hover:text-white text-sm transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Todos os parceiros
      </Link>

      {/* Card principal */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">

        {/* Header do parceiro */}
        <div className="p-6 md:p-8 flex items-start gap-5 border-b border-[#2a2a2a]">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-[#981c1c] flex items-center justify-center">
            {resolveLogoUrl(parceiro.logo_url) ? (
              <img
                src={resolveLogoUrl(parceiro.logo_url)!}
                alt={parceiro.nome_empresa}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-display text-4xl text-white">{inicial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl md:text-4xl tracking-wider text-white leading-tight">
              {parceiro.nome_empresa.toUpperCase()}
            </h1>
            {parceiro.segmento && (
              <span className="inline-block mt-2 text-xs font-medium uppercase tracking-wide text-[#9ca3af] bg-[#222] border border-[#2a2a2a] px-2.5 py-0.5 rounded-full">
                {parceiro.segmento}
              </span>
            )}
            {parceiro.destaque && (
              <span className="inline-block ml-2 mt-2 text-xs font-medium uppercase tracking-wide text-[#e43333] bg-[#e43333]/10 border border-[#e43333]/20 px-2.5 py-0.5 rounded-full">
                Destaque
              </span>
            )}
          </div>
        </div>

        {/* Benefício */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-[#981c1c]/15 border border-[#e43333]/30 rounded-2xl p-5">
            <p className="text-[#9ca3af] text-xs uppercase tracking-widest mb-2 font-medium">
              Seu Benefício
            </p>
            <p className="text-white text-base leading-relaxed font-medium">
              {parceiro.desconto_descricao}
            </p>
            <p className="text-[#9ca3af] text-sm mt-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#e43333] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {parceiro.frequencia_desconto ?? 'Consultar parceiro'}
            </p>
          </div>

          {parceiro.endereco && (
            <div className="flex items-start gap-3 text-[#9ca3af] text-sm">
              <svg className="w-4 h-4 text-[#e43333] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {parceiro.endereco}
            </div>
          )}

          {/* Ações (client component — copy + WhatsApp) */}
          <ParceiroDetalheActions parceiro={parceiro} />
        </div>
      </div>
    </div>
  );
}
