'use client';

import { useState } from 'react';
import { DiscountModal } from './DiscountModal';
import { resolveLogoUrl } from '@/utils/logo';
import type { ParceiroListItem } from '@/types/parceiro';

interface PartnerCardProps {
  parceiro: ParceiroListItem;
  mode?: 'grid' | 'featured';
}

export function PartnerCard({ parceiro, mode = 'grid' }: PartnerCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const inicial = parceiro.nome_empresa.charAt(0).toUpperCase();
  const logoSrc = resolveLogoUrl(parceiro.logo_url);

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        className={[
          'group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl',
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-[2px] hover:border-[#e43333]/30 hover:shadow-lg hover:shadow-black/30',
          mode === 'featured' ? 'p-6' : 'p-5',
        ].join(' ')}
        aria-label={`Ver benefício: ${parceiro.nome_empresa}`}
      >
        {/* Logo / Inicial */}
        <div className="flex items-start gap-4 mb-4">
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden">
            {logoSrc && !logoError ? (
              <img
                src={logoSrc}
                alt={parceiro.nome_empresa}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#981c1c] flex items-center justify-center">
                <span className="font-display text-xl text-white leading-none">
                  {inicial}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-white text-sm leading-snug truncate">
                {parceiro.nome_empresa}
              </h3>
              {parceiro.destaque && (
                <span className="shrink-0 bg-[#e43333]/15 border border-[#e43333]/30 text-[#e43333] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Destaque
                </span>
              )}
            </div>
            {parceiro.segmento && (
              <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide text-[#9ca3af] bg-[#222] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                {parceiro.segmento}
              </span>
            )}
          </div>
        </div>

        {/* Preview do desconto */}
        <p className="text-[#9ca3af] text-sm line-clamp-2 mb-4 leading-relaxed">
          {parceiro.desconto_descricao}
        </p>

        {/* CTA */}
        <div className="flex items-center gap-1 text-[#e43333] text-sm font-medium group-hover:gap-2 transition-all">
          <span>Ver benefício</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </article>

      <DiscountModal
        parceiro={parceiro}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
export function PartnerCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#222] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-[#222] rounded animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="h-3 w-1/3 bg-[#222] rounded animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-[#222] rounded animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        <div className="h-3 w-4/5 bg-[#222] rounded animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <div className="h-4 w-24 bg-[#222] rounded animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
    </div>
  );
}
