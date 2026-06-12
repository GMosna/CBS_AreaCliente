'use client';

import { useEffect, useState } from 'react';

interface ResgatadosCardProps {
  inicial: number;
}

export function ResgatadosCard({ inicial }: ResgatadosCardProps) {
  const [count, setCount] = useState(inicial);

  useEffect(() => {
    function onUsoRegistrado() {
      setCount((c) => c + 1);
    }
    window.addEventListener('cupom-usado', onUsoRegistrado);
    return () => window.removeEventListener('cupom-usado', onUsoRegistrado);
  }, []);

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2">
        benefícios utilizados
      </p>
      <p className="font-display text-5xl text-[#e43333] tracking-wide leading-none">
        {count}
      </p>
      <p className="text-[var(--color-text-subtle)] text-sm mt-2">Quantidade Resgatada</p>
    </div>
  );
}
