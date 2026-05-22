import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';

// Bebas Neue: fonte display — títulos, logo, números grandes
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

// DM Sans: fonte corpo — parágrafos, labels, botões
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sassi Imóveis — Área do Inquilino',
  description: 'Portal exclusivo de benefícios para inquilinos Sassi Imóveis.',
  robots: { index: false, follow: false }, // portal privado
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
