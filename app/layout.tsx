import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const bebasNeue = localFont({
  src: './fonts/bebas-neue-latin.woff2',
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

const dmSans = localFont({
  src: [
    { path: './fonts/dm-sans-latin.woff2',              weight: '100 1000', style: 'normal' },
    { path: './fonts/dm-sans-latin-ext.woff2',          weight: '100 1000', style: 'normal' },
    { path: './fonts/dm-sans-italic-latin.woff2',       weight: '100 1000', style: 'italic' },
    { path: './fonts/dm-sans-italic-latin-ext.woff2',   weight: '100 1000', style: 'italic' },
  ],
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
