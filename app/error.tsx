'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Loga apenas o digest (referência opaca do servidor) — nunca o stack trace
    console.error('[SASSI] Erro:', error.digest ?? 'sem-digest');
  }, [error]);

  return (
    <div className="error-page">
      <div className="error-code">500</div>
      <h1 className="error-title">Algo deu errado</h1>
      <p className="error-subtitle">
        Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
