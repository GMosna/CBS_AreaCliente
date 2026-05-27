'use client';

import { useState, useEffect } from 'react';
import { buildWhatsAppUrl } from '@/utils/whatsapp';

interface Parceiro {
  id: string;
  nome_empresa: string;
  desconto_descricao: string;
  whatsapp: string | null;
}

export function ParceiroDetalheActions({ parceiro }: { parceiro: Parceiro }) {
  const [copied, setCopied] = useState(false);

  // Registrar visualização
  useEffect(() => {
    fetch(`/api/portal/parceiros/${parceiro.id}`, { method: 'POST' }).catch(() => {});
  }, [parceiro.id]);

  async function copiar() {
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

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={copiar}
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
    </div>
  );
}
