'use client';

import { useEffect, useState } from 'react';
import type { ParceiroListItem } from '@/types/parceiro';
import { buildWhatsAppUrl } from '@/utils/whatsapp';
import { resolveLogoUrl } from '@/utils/logo';

interface DiscountModalProps {
  parceiro: ParceiroListItem;
  open: boolean;
  onClose: () => void;
}

export function DiscountModal({ parceiro, open, onClose }: DiscountModalProps) {
  const [copied, setCopied] = useState(false);

  // Registrar visualização no audit_log (fire and forget)
  useEffect(() => {
    if (!open) return;
    fetch(`/api/portal/parceiros/${parceiro.id}`, { method: 'POST' }).catch(() => {});
  }, [open, parceiro.id]);

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function copiarDesconto() {
    const texto = parceiro.desconto_descricao;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        alert(`Copie o texto abaixo:\n\n${texto}`);
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function abrirWhatsApp() {
    const url = buildWhatsAppUrl(parceiro.whatsapp ?? '');
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const inicial = parceiro.nome_empresa.charAt(0).toUpperCase();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Benefício: ${parceiro.nome_empresa}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/75 animate-fade-in"
        onClick={onClose}
      />

      {/* Conteúdo: bottom drawer mobile / modal desktop */}
      <div
        className={[
          'relative z-10 w-full bg-[#1a1a1a] border-t border-[#2a2a2a]',
          'rounded-t-3xl md:rounded-2xl md:border md:max-w-lg md:mx-4',
          'max-h-[90vh] overflow-y-auto',
          'animate-slide-up md:animate-scale-in',
        ].join(' ')}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-[#2a2a2a] rounded-full" />
        </div>

        <div className="p-6 md:p-8">
          {/* Header do modal */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-[#981c1c] flex items-center justify-center">
                {resolveLogoUrl(parceiro.logo_url) ? (
                  <img
                    src={resolveLogoUrl(parceiro.logo_url)!}
                    alt={parceiro.nome_empresa}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display text-3xl text-white">{inicial}</span>
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl tracking-wide text-white leading-tight">
                  {parceiro.nome_empresa.toUpperCase()}
                </h2>
                {parceiro.segmento && (
                  <span className="inline-block mt-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af] bg-[#222] border border-[#2a2a2a] px-2.5 py-0.5 rounded-full">
                    {parceiro.segmento}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#222] transition-colors shrink-0"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Box de benefício */}
          <div className="bg-[#981c1c]/15 border border-[#e43333]/30 rounded-2xl p-5 mb-6">
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

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <button
              onClick={copiarDesconto}
              className={[
                'w-full py-3 px-4 rounded-xl font-semibold text-sm',
                'flex items-center justify-center gap-2 transition-all duration-200',
                copied
                  ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]'
                  : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
              ].join(' ')}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar desconto
                </>
              )}
            </button>

            {parceiro.whatsapp && (
              <button
                onClick={abrirWhatsApp}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-transparent border border-[#2a2a2a] text-[#9ca3af] hover:border-[#25d366] hover:text-[#25d366] flex items-center justify-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                Falar no WhatsApp
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-sm text-[#6b7280] hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
