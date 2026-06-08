'use client';

import { useState } from 'react';
import { DiscountModal } from './DiscountModal';
import { FallbackLogo } from './FallbackLogo';
import { resolveLogoUrl } from '@/utils/logo';
import type { ParceiroListItem } from '@/types/parceiro';

function CarouselCard({ parceiro }: { parceiro: ParceiroListItem }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const logoSrc = resolveLogoUrl(parceiro.logo_url);

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        className="group shrink-0 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[#e43333]/50 hover:shadow-[0_8px_32px_rgba(228,51,51,0.15)]"
        aria-label={`Ver benefício: ${parceiro.nome_empresa}`}
      >
        {/* Logo */}
        <div className="w-full h-36 bg-[#111] rounded-xl mb-3 overflow-hidden flex items-center justify-center">
          {logoSrc && !logoError ? (
            <img
              src={logoSrc}
              alt={parceiro.nome_empresa}
              className="w-full h-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <FallbackLogo nome={parceiro.nome_empresa} size={96} />
          )}
        </div>

        {/* Nome */}
        <h3 className="font-semibold text-white text-sm text-center leading-snug line-clamp-2 mb-2">
          {parceiro.nome_empresa}
        </h3>

        {/* Segmento */}
        {parceiro.segmento && (
          <div className="flex justify-center mb-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-[#9ca3af] bg-[#222] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
              {parceiro.segmento}
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto w-full flex items-center justify-center gap-1.5 bg-[#e43333]/10 border border-[#e43333]/20 rounded-lg py-2 text-[#e43333] text-xs font-medium group-hover:bg-[#e43333]/20 transition-colors">
          <span>Ver benefício</span>
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

interface NovidadesCarouselProps {
  parceiros: ParceiroListItem[];
}

export function NovidadesCarousel({ parceiros }: NovidadesCarouselProps) {
  if (parceiros.length === 0) return null;

  // Duplica os itens para o loop contínuo ser seamless
  const itens = [...parceiros, ...parceiros];

  return (
    <div className="overflow-hidden -mx-4 px-4">
      <div className="carousel-track">
        {itens.map((p, i) => (
          <CarouselCard key={`${p.id}-${i}`} parceiro={p} />
        ))}
      </div>
    </div>
  );
}
