'use client';

import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DiscountModal } from './DiscountModal';
import { FallbackLogo } from './FallbackLogo';
import { resolveLogoUrl } from '@/utils/logo';
import type { ParceiroListItem } from '@/types/parceiro';

interface PartnerCardProps {
  parceiro: ParceiroListItem;
  mode?: 'grid' | 'featured';
}

export const PartnerCard = memo(function PartnerCard({ parceiro, mode = 'grid' }: PartnerCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const logoSrc = resolveLogoUrl(parceiro.logo_url);

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        className={[
          'group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col h-full',
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-1 hover:border-[#e43333]/50',
          'hover:shadow-[0_8px_32px_rgba(228,51,51,0.15)]',
          mode === 'featured' ? 'p-5' : 'p-4',
        ].join(' ')}
        aria-label={`Ver benefício: ${parceiro.nome_empresa}`}
      >
        {/* Área da logo */}
        <div className="w-full h-40 bg-[var(--color-surface-2)] rounded-xl mb-4 overflow-hidden flex items-center justify-center">
          {logoSrc && !logoError ? (
            <img
              src={logoSrc}
              alt={parceiro.nome_empresa}
              className="w-full h-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <FallbackLogo nome={parceiro.nome_empresa} size={120} />
          )}
        </div>

        {/* Nome */}
        <h3 className="font-semibold text-[var(--color-text)] text-sm text-center leading-snug mb-2 line-clamp-2">
          {parceiro.nome_empresa}
        </h3>

        {/* Badges segmento + destaque */}
        <div className="flex flex-wrap items-center justify-center gap-1 mb-3">
          {parceiro.segmento && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
              {parceiro.segmento}
            </span>
          )}
          {parceiro.destaque && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#e43333]/15 border border-[#e43333]/30 text-[#e43333] px-2 py-0.5 rounded-full">
              Destaque
            </span>
          )}
        </div>

        {/* Badge tipo de loja */}
        <div className="flex-1" />
        <div className="flex justify-center mb-4">
          {parceiro.tipo_loja === 'fisica' && (
            <span className="text-[10px] font-medium uppercase tracking-wide bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
              🏪 Física
            </span>
          )}
          {parceiro.tipo_loja === 'online' && (
            <span className="text-[10px] font-medium uppercase tracking-wide bg-[var(--color-surface)] border border-[#3b82f6]/30 text-[#3b82f6] px-2 py-0.5 rounded-full">
              💻 Online
            </span>
          )}
          {parceiro.tipo_loja === 'ambos' && (
            <span className="text-[10px] font-medium uppercase tracking-wide bg-[var(--color-surface)] border border-[#e43333]/30 text-[#e43333] px-2 py-0.5 rounded-full">
              🏪💻 Físico e Online
            </span>
          )}
        </div>

        {/* CTA full-width */}
        <div className="w-full flex items-center justify-center gap-1.5 bg-[#e43333]/10 border border-[#e43333]/20 rounded-lg py-2.5 text-[#e43333] text-sm font-medium group-hover:bg-[#e43333]/20 transition-colors">
          <span>Ver benefício</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </article>

      {mounted && createPortal(
        <DiscountModal
          parceiro={parceiro}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />,
        document.body
      )}
    </>
  );
});

// ── Skeleton ──────────────────────────────────────────────────
export function PartnerCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
      <div className="w-full h-40 bg-[var(--color-surface-2)] animate-shimmer rounded-xl mb-4" style={{ backgroundSize: '200% 100%' }} />
      <div className="h-5 bg-[var(--color-surface-2)] animate-shimmer rounded w-3/4 mx-auto mb-2" style={{ backgroundSize: '200% 100%' }} />
      <div className="h-3 bg-[var(--color-surface-2)] animate-shimmer rounded w-1/3 mx-auto mb-3" style={{ backgroundSize: '200% 100%' }} />
      <div className="space-y-1.5 mb-3">
        <div className="h-3 bg-[var(--color-surface-2)] animate-shimmer rounded" style={{ backgroundSize: '200% 100%' }} />
        <div className="h-3 w-4/5 bg-[var(--color-surface-2)] animate-shimmer rounded mx-auto" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <div className="h-9 bg-[var(--color-surface-2)] animate-shimmer rounded-lg" style={{ backgroundSize: '200% 100%' }} />
    </div>
  );
}
