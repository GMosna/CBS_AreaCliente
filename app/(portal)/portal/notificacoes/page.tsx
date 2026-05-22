'use client';

import { useState, useEffect } from 'react';
import type { Notificacao, TipoNotificacao } from '@/types/notificacao';

const TIPO_BADGE: Record<TipoNotificacao, string> = {
  info:    'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]',
  aviso:   'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]',
  urgente: 'bg-[#e43333]/10 border-[#e43333]/30 text-[#e43333]',
};

const TIPO_LABELS: Record<TipoNotificacao, string> = {
  info:    'Info',
  aviso:   'Aviso',
  urgente: 'Urgente',
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificacaoSkeleton() {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 bg-[#222] rounded-full" />
        <div className="h-3 w-28 bg-[#222] rounded" />
      </div>
      <div className="h-4 w-3/4 bg-[#222] rounded" />
      <div className="h-3 w-full bg-[#222] rounded" />
      <div className="h-3 w-2/3 bg-[#222] rounded" />
    </div>
  );
}

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch('/api/portal/notificacoes')
      .then((r) => r.json())
      .then((d) => setNotificacoes(d.notificacoes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarTodasLidas() {
    await fetch('/api/portal/notificacoes/read-all', { method: 'POST' });
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  async function marcarLida(id: string) {
    await fetch(`/api/portal/notificacoes/${id}/read`, { method: 'POST' });
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-white leading-none">
            SUAS <span className="text-[#e43333]">NOTIFICAÇÕES</span>
          </h1>
          {!loading && naoLidas > 0 && (
            <p className="text-[#9ca3af] text-sm mt-1">
              {naoLidas} {naoLidas === 1 ? 'não lida' : 'não lidas'}
            </p>
          )}
        </div>
        {!loading && naoLidas > 0 && (
          <button
            onClick={marcarTodasLidas}
            className="shrink-0 text-sm text-[#9ca3af] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a] px-4 py-2 rounded-xl transition-colors mt-1"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <NotificacaoSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && notificacoes.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="font-display text-2xl tracking-wider text-white mb-2">SEM NOTIFICAÇÕES</p>
          <p className="text-[#6b7280] text-sm">Você está em dia. Novas notificações aparecerão aqui.</p>
        </div>
      )}

      {/* List */}
      {!loading && notificacoes.length > 0 && (
        <div className="space-y-3">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={`relative bg-[#1a1a1a] border rounded-2xl p-5 transition-all duration-200 ${
                n.lida
                  ? 'border-[#2a2a2a] opacity-60'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              {/* Unread dot */}
              {!n.lida && (
                <span className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#e43333]" />
              )}

              <div className="pr-5">
                {/* Meta */}
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${TIPO_BADGE[n.tipo]}`}>
                    {TIPO_LABELS[n.tipo]}
                  </span>
                  <span className="text-[#6b7280] text-xs">{formatarData(n.criada_em)}</span>
                </div>

                {/* Content */}
                <h3 className="text-white font-semibold text-sm mb-1">{n.titulo}</h3>
                <p className="text-[#9ca3af] text-sm leading-relaxed">{n.mensagem}</p>

                {/* Mark as read */}
                {!n.lida && (
                  <button
                    onClick={() => marcarLida(n.id)}
                    className="mt-3 text-xs text-[#6b7280] hover:text-[#e43333] transition-colors"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
