/**
 * Sassi Imóveis — Design Tokens
 *
 * Fonte única de verdade para cores, tipografia e espaçamento.
 * Copie este arquivo para os dois projetos (landing + portal)
 * e importe onde precisar.
 *
 * Uso em Tailwind (tailwind.config.ts):
 *   import { colors } from './design-tokens'
 *   theme: { extend: { colors: colors.brand } }
 *
 * Uso em CSS-in-JS / inline styles:
 *   import { colors } from '@/design-tokens'
 *   style={{ backgroundColor: colors.brand.red }}
 */

// ----------------------------------------------------------------
// CORES
// ----------------------------------------------------------------
export const colors = {
  brand: {
    /** Vermelho principal — fundos, bordas, elementos de suporte */
    redPrimary:  '#981c1c',
    /** Vermelho de destaque — CTAs, links, badges ativos */
    redBright:   '#e43333',
    /** Vermelho hover — estado interativo sobre redBright */
    redHover:    '#c42b2b',
    /** Vermelho translúcido — fundos sutis, chips */
    redMuted:    'rgba(228, 51, 51, 0.15)',
    /** Vermelho borda suave */
    redBorder:   'rgba(228, 51, 51, 0.30)',
  },

  bg: {
    /** Fundo global da página */
    base:      '#0d0d0d',
    /** Surface de cards e painéis */
    surface:   '#1a1a1a',
    /** Surface elevada — inputs, menus, tooltip */
    elevated:  '#222222',
    /** Header / nav fixo */
    header:    '#111111',
  },

  border: {
    /** Borda padrão */
    default:  '#2a2a2a',
    /** Borda hover / foco suave */
    hover:    '#3a3a3a',
  },

  text: {
    /** Texto principal */
    primary:  '#ffffff',
    /** Texto secundário — labels, descrições */
    muted:    '#9ca3af',
    /** Texto terciário — timestamps, placeholders */
    subtle:   '#6b7280',
  },

  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error:   '#e43333',
    info:    '#3b82f6',
  },
} as const;

// ----------------------------------------------------------------
// TIPOGRAFIA
// ----------------------------------------------------------------
export const typography = {
  /**
   * Display — Bebas Neue
   * Usado em títulos, headers e valores numéricos grandes.
   * Carregado via next/font/google no layout.tsx de cada projeto.
   */
  fontDisplay: "'Bebas Neue', 'Arial Narrow', sans-serif",

  /**
   * Body — DM Sans
   * Usado em todo o texto corrido, labels e UI.
   */
  fontBody: "'DM Sans', Arial, sans-serif",

  /** Escala de tamanho (em px) */
  size: {
    xs:   12,
    sm:   13,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 64,
    hero:  80,
  },

  /** Peso */
  weight: {
    normal:    400,
    medium:    500,
    semibold:  600,
    bold:      700,
  },

  /** Letter spacing para fonte display */
  tracking: {
    tight:  '0.5px',
    normal: '2px',
    wide:   '3px',
    wider:  '4px',
    widest: '8px',
  },
} as const;

// ----------------------------------------------------------------
// ESPAÇAMENTO (múltiplos de 4px)
// ----------------------------------------------------------------
export const spacing = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ----------------------------------------------------------------
// BORDER RADIUS
// ----------------------------------------------------------------
export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl':'20px',
  '3xl':'24px',
  full: '9999px',
} as const;

// ----------------------------------------------------------------
// SOMBRAS
// ----------------------------------------------------------------
export const shadows = {
  sm:    '0 1px 3px rgba(0,0,0,0.4)',
  md:    '0 4px 12px rgba(0,0,0,0.5)',
  lg:    '0 8px 32px rgba(0,0,0,0.6)',
  modal: '0 24px 64px rgba(0,0,0,0.7)',
  red:   '0 4px 20px rgba(228, 51, 51, 0.25)',
} as const;

// ----------------------------------------------------------------
// BREAKPOINTS (px) — consistente com Tailwind padrão
// ----------------------------------------------------------------
export const breakpoints = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

// ----------------------------------------------------------------
// ANIMAÇÕES — nomes das classes Tailwind customizadas
// (devem estar no tailwind.config.ts de cada projeto)
// ----------------------------------------------------------------
export const animations = {
  fadeUp:   'animate-fade-up',
  fadeIn:   'animate-fade-in',
  slideUp:  'animate-slide-up',
  scaleIn:  'animate-scale-in',
  shimmer:  'animate-shimmer',
  spin:     'animate-spin',
} as const;

// ----------------------------------------------------------------
// URLs DOS PROJETOS
// ----------------------------------------------------------------
export const urls = {
  landing: process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://landing-page-sassi-club.vercel.app',
  portal:  process.env.NEXT_PUBLIC_PORTAL_URL  ?? 'https://sassi-portal.vercel.app',
} as const;

// ----------------------------------------------------------------
// EXPORT UNIFICADO
// ----------------------------------------------------------------
const tokens = { colors, typography, spacing, radius, shadows, breakpoints, animations, urls };
export default tokens;
