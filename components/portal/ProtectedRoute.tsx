'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Camada extra client-side de proteção.
// O middleware já bloqueia usuários não autenticados no servidor;
// este componente garante que a UI não renderize enquanto o token
// é verificado e redireciona caso useAuth não encontre sessão.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { inquilino, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !inquilino) {
      router.replace('/login');
    }
  }, [inquilino, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <span className="btn-spinner" style={{ width: '36px', height: '36px' }} />
      </div>
    );
  }

  if (!inquilino) return null;

  return <>{children}</>;
}
