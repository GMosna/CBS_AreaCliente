'use client';

import { useEffect, useState } from 'react';

interface BeneficiosCardProps {
  inicial: number;
}

export function BeneficiosCard({ inicial }: BeneficiosCardProps) {
  const [count, setCount] = useState(inicial);

  useEffect(() => {
    function onUsoRegistrado() {
      setCount(c => Math.max(0, c - 1));
    }
    window.addEventListener('cupom-usado', onUsoRegistrado);
    return () => window.removeEventListener('cupom-usado', onUsoRegistrado);
  }, []);

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2">
        {count === 0 ? 'volte em breve' : 'para você resgatar'}
      </p>
      <p className="font-display text-5xl text-[#e43333] tracking-wide leading-none">
        {count}
      </p>
      <p className="text-[var(--color-text-subtle)] text-sm mt-2">Benefícios Disponíveis</p>
    </div>
  );
}
