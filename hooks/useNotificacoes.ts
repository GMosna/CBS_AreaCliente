'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Notificacao } from '@/types/notificacao';

type NotificacoesState = {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  marcarTodasLidas: () => Promise<void>;
  recarregar: () => void;
};

export function useNotificacoes(): NotificacoesState {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading]           = useState(true);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notificacoes');
      if (res.ok) {
        const data = await res.json() as { notificacoes: Notificacao[] };
        setNotificacoes(data.notificacoes ?? []);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarTodasLidas = async () => {
    await fetch('/api/portal/notificacoes/read-all', { method: 'POST' });
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return { notificacoes, naoLidas, loading, marcarTodasLidas, recarregar: carregar };
}
