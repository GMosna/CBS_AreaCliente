'use client';

import { PartnerCard } from './PartnerCard';
import type { ParceiroListItem } from '@/types/parceiro';

interface NovidadesCarouselProps {
  parceiros: ParceiroListItem[];
}

export function NovidadesCarousel({ parceiros }: NovidadesCarouselProps) {
  if (parceiros.length === 0) return null;

  const itens = [...parceiros, ...parceiros];

  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2">
      {/* Gradiente fade esquerda */}
      <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
      {/* Gradiente fade direita */}
      <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-[#0d0d0d] to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden">
        <div className="novidades-track py-2">
          {itens.map((p, i) => (
            <div key={`${p.id}-${i}`} className="w-64 shrink-0">
              <PartnerCard parceiro={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
