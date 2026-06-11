import { headers } from 'next/headers';
import { getParceirosAtivos } from '@/lib/parceiros-cache';
import { ParceirosClient } from './ParceirosClient';

export default async function ParceirosPage() {
  const inquilinoId = (await headers()).get('x-inquilino-id');
  if (!inquilinoId) return null;

  const parceiros = await getParceirosAtivos();
  const segmentos = [...new Set(parceiros.map((p) => p.segmento).filter(Boolean))] as string[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-white leading-none">
          NOSSOS <span className="text-[#e43333]">PARCEIROS</span>
        </h1>
        <p className="text-[#9ca3af] text-sm mt-1">
          {parceiros.length === 0
            ? 'Parceiros serão disponibilizados em breve'
            : `${parceiros.length} ${parceiros.length === 1 ? 'empresa parceira' : 'empresas parceiras'} com benefícios exclusivos para você`}
        </p>
      </div>

      <ParceirosClient parceiros={parceiros} segmentos={segmentos} />
    </div>
  );
}
