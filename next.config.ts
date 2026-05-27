import type { NextConfig } from 'next';

// ============================================================
// SASSI IMÓVEIS — Configuração Next.js + Headers de Segurança
//
// Os headers são aplicados em TODAS as respostas pelo framework,
// incluindo assets estáticos e rotas de erro — camada adicional
// aos headers que o middleware aplica em respostas dinâmicas.
// ============================================================

const CSP = [
  "default-src 'self'",
  // Next.js (App Router) requer 'unsafe-inline' para scripts de hidratação
  // Cloudflare Turnstile carrega script de challenges.cloudflare.com
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  // Tailwind gera classes inline; sem fontes externas (fontes são locais)
  "style-src 'self' 'unsafe-inline'",
  // Fontes servidas localmente em /app/fonts/
  "font-src 'self'",
  // Logos de parceiros podem vir de domínios externos (campo logo_url)
  "img-src 'self' data: blob: https:",
  // Supabase: HTTPS para REST/Auth, WSS para Realtime
  // Turnstile: verifica tokens em challenges.cloudflare.com
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  // Turnstile renderiza em um iframe de challenges.cloudflare.com
  "frame-src 'self' https://challenges.cloudflare.com",
  // Bloqueia embedding em frames externos — defense-in-depth além do X-Frame-Options
  "frame-ancestors 'none'",
  // Previne injeção de base tags que redirecionam todos os links
  "base-uri 'self'",
  // Restringe targets de formulários (previne exfiltração via form action)
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  // Impede clickjacking via iframe
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impede MIME type sniffing (ex: executar JS disfarçado de imagem)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Ativa filtro XSS legado dos browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Limita informação do Referer em navegações cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desabilita APIs sensíveis que não são usadas pelo portal
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Força HTTPS por 2 anos, inclui subdomínios, solicita preload
  // ⚠️ Só ativo em HTTPS — Vercel always serve HTTPS em produção
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy — controla quais recursos podem ser carregados
  { key: 'Content-Security-Policy', value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplica em TODAS as rotas, incluindo assets estáticos
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
