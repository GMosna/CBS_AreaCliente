'use client';

function getIniciais(nome: string): string {
  const iniciais = nome
    .split(' ')
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
  return iniciais || nome.charAt(0).toUpperCase();
}

interface FallbackLogoProps {
  nome: string;
  size?: number;
}

export function FallbackLogo({ nome, size = 120 }: FallbackLogoProps) {
  const iniciais = getIniciais(nome);
  const fontSize = Math.round(size * 0.35);

  return (
    <div
      className="flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #981c1c, #e43333)',
      }}
    >
      <span
        className="font-display text-white leading-none"
        style={{ fontSize }}
      >
        {iniciais}
      </span>
    </div>
  );
}
