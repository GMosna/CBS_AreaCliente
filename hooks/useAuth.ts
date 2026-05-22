'use client';

import { useEffect, useState } from 'react';

type Inquilino = {
  id: string;
  nome: string;
  role: 'inquilino';
};

type AuthState = {
  inquilino: Inquilino | null;
  loading: boolean;
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [inquilino, setInquilino] = useState<Inquilino | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca os dados do inquilino autenticado.
    // O middleware já validou o JWT — esta rota apenas retorna o perfil.
    fetch('/api/portal/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Inquilino | null) => setInquilino(data))
      .catch(() => setInquilino(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return { inquilino, loading, logout };
}
