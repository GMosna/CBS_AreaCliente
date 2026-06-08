'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { PartnerCard } from '@/components/portal/PartnerCard';
import type { ParceiroListItem } from '@/types/parceiro';

interface ParceirosClientProps {
  parceiros: ParceiroListItem[];
  segmentos: string[];
}

export function ParceirosClient({ parceiros, segmentos }: ParceirosClientProps) {
  const [busca, setBusca]               = useState('');
  const [buscaDebounced, setDebounced]  = useState('');
  const [segmentoAtivo, setSegmento]    = useState<string | null>(null);
  const timerRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBusca = useCallback((value: string) => {
    setBusca(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), 300);
  }, []);

  const filtrados = useMemo(() => {
    let lista = parceiros;

    if (segmentoAtivo) {
      lista = lista.filter((p) => p.segmento === segmentoAtivo);
    }

    if (buscaDebounced.trim()) {
      const q = buscaDebounced.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nome_empresa.toLowerCase().includes(q) ||
          (p.segmento?.toLowerCase() ?? '').includes(q) ||
          p.desconto_descricao.toLowerCase().includes(q)
      );
    }

    return lista;
  }, [parceiros, segmentoAtivo, buscaDebounced]);

  const temFiltro = busca !== '' || segmentoAtivo !== null;

  return (
    <div className="space-y-6">

      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por nome, segmento ou benefício..."
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-11 pr-10 py-3 text-white placeholder-[#6b7280] text-sm focus:outline-none focus:border-[#e43333]/50 transition-colors"
        />
        {busca && (
          <button
            onClick={() => handleBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b7280] hover:text-white transition-colors"
            aria-label="Limpar busca"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Segment filter pills */}
      {segmentos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSegmento(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              segmentoAtivo === null
                ? 'bg-[#e43333] text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:border-[#e43333]/40 hover:text-white'
            }`}
          >
            Todos ({parceiros.length})
          </button>
          {segmentos.map((seg) => {
            const count = parceiros.filter((p) => p.segmento === seg).length;
            return (
              <button
                key={seg}
                onClick={() => setSegmento(segmentoAtivo === seg ? null : seg)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  segmentoAtivo === seg
                    ? 'bg-[#e43333] text-white'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:border-[#e43333]/40 hover:text-white'
                }`}
              >
                {seg} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results count when filtered */}
      {temFiltro && (
        <p className="text-[#6b7280] text-sm">
          {filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'}
          {segmentoAtivo && ` em ${segmentoAtivo}`}
          {buscaDebounced.trim() && ` para "${buscaDebounced.trim()}"`}
        </p>
      )}

      {/* Grid or empty state */}
      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((p) => (
            <PartnerCard key={p.id} parceiro={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            {parceiros.length === 0 ? (
              <svg className="w-7 h-7 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
          </div>
          <p className="font-display text-2xl tracking-wider text-white mb-2">
            {parceiros.length === 0 ? 'EM BREVE' : 'SEM RESULTADOS'}
          </p>
          <p className="text-[#6b7280] text-sm">
            {parceiros.length === 0
              ? 'Novos parceiros serão disponibilizados em breve.'
              : 'Tente uma busca diferente ou remova os filtros.'}
          </p>
          {temFiltro && parceiros.length > 0 && (
            <button
              onClick={() => { handleBusca(''); setSegmento(null); }}
              className="mt-4 text-[#e43333] hover:text-[#981c1c] text-sm font-medium transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
