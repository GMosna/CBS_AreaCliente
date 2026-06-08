'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DiscountModal } from './DiscountModal';
import { resolveLogoUrl } from '@/utils/logo';
import type { ParceiroListItem } from '@/types/parceiro';

interface LogoItemProps {
  parceiro: ParceiroListItem;
}

function LogoItem({ parceiro }: LogoItemProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const logoSrc = resolveLogoUrl(parceiro.logo_url);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="shrink-0 flex items-center justify-center px-10 opacity-70 hover:opacity-100 transition-opacity duration-300 focus:outline-none"
        aria-label={`Ver benefício: ${parceiro.nome_empresa}`}
      >
        {logoSrc && !logoError ? (
          <img
            src={logoSrc}
            alt={parceiro.nome_empresa}
            className="h-14 w-auto object-contain max-w-[140px]"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #981c1c, #e43333)' }}
          >
            <span className="font-display text-white text-xl leading-none">
              {parceiro.nome_empresa.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </button>

      {/* Portal garante que o modal fica fora do transform do carrossel */}
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
}

interface NovidadesCarouselProps {
  parceiros: ParceiroListItem[];
}

export function NovidadesCarousel({ parceiros }: NovidadesCarouselProps) {
  if (parceiros.length === 0) return null;

  const itens = [...parceiros, ...parceiros];

  return (
    <section className="relative w-screen left-1/2 -translate-x-1/2 bg-[#0d0d0d] py-10">
      {/* Gradiente fade esquerda */}
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
      {/* Gradiente fade direita */}
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#0d0d0d] to-transparent z-10 pointer-events-none" />

      {/* Trilha animada — overflow-hidden somente aqui */}
      <div className="overflow-hidden">
        <div className="logos-track">
          {itens.map((p, i) => (
            <LogoItem key={`${p.id}-${i}`} parceiro={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
