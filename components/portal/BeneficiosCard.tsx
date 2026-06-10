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
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
      <p className="text-[#9ca3af] text-xs uppercase tracking-widest mb-2">
        {count === 0 ? 'volte em breve' : 'para você resgatar'}
      </p>
      <p className="font-display text-5xl text-[#e43333] tracking-wide leading-none">
        {count}
      </p>
      <p className="text-[#6b7280] text-sm mt-2">Benefícios Disponíveis</p>
    </div>
  );
}
