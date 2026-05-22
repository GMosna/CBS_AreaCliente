// ============================================================
// SASSI IMÓVEIS — Middleware de Autenticação e Segurança
//
// Roda em Edge Runtime ANTES de cada requisição.
// Responsabilidades:
//   1. Proteger /portal/* e /api/portal/*
//   2. Injetar x-inquilino-id nos headers para routes handlers
//   3. Tentar refresh silencioso quando o access token expira
//   4. Adicionar headers de segurança em TODAS as respostas
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/verify-jwt';

// ----------------------------------------------------------
// Headers de segurança aplicados em TODAS as respostas
// ----------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ----------------------------------------------------------
// Rotas públicas — nunca exigem autenticação
// ----------------------------------------------------------
const ROTAS_PUBLICAS = ['/', '/login', '/api/auth/'];

function isRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(rota)
  );
}

// ----------------------------------------------------------
// Distingue API de página para resposta adequada
// APIs retornam 401 JSON; páginas redirecionam para /login
// ----------------------------------------------------------
function isRotaApi(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ----------------------------------------------------------
// Aplica os security headers em qualquer NextResponse
// ----------------------------------------------------------
function comSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([chave, valor]) => {
    response.headers.set(chave, valor);
  });
  return response;
}

// ----------------------------------------------------------
// Refresh silencioso: chama /api/auth/refresh passando o
// refresh_token via header Cookie.
//
// ⚠️  O refresh_token tem path=/api/auth/refresh, então
//     o browser só o envia automaticamente para essa rota.
//     Aqui nós o relemos e encaminhamos manualmente.
// ----------------------------------------------------------
async function tentarRefreshSilencioso(
  request: NextRequest
): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) return null;

  try {
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    const refreshResponse = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
    });

    if (!refreshResponse.ok) return null;

    // Propaga os novos cookies (access_token + refresh_token) para o browser
    const response = NextResponse.next({ request: { headers: request.headers } });
    refreshResponse.headers.getSetCookie().forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });

    return comSecurityHeaders(response);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------
// Resposta de "não autenticado" adequada ao tipo de rota
// ----------------------------------------------------------
function respostaNaoAutenticado(request: NextRequest): NextResponse {
  if (isRotaApi(request.nextUrl.pathname)) {
    return comSecurityHeaders(
      NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    );
  }
  return comSecurityHeaders(
    NextResponse.redirect(new URL('/login', request.url))
  );
}

// ----------------------------------------------------------
// Resposta de "sessão expirada" + limpeza do cookie inválido
// ----------------------------------------------------------
function respostaSessaoExpirada(request: NextRequest): NextResponse {
  if (isRotaApi(request.nextUrl.pathname)) {
    const res = comSecurityHeaders(
      NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
    );
    res.cookies.set('access_token', '', { maxAge: 0, path: '/' });
    return res;
  }
  const res = comSecurityHeaders(
    NextResponse.redirect(new URL('/login', request.url))
  );
  res.cookies.set('access_token', '', { maxAge: 0, path: '/' });
  return res;
}

// ============================================================
// MIDDLEWARE PRINCIPAL
// ============================================================
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rotas públicas
  if (isRotaPublica(pathname)) {
    // Se já está autenticado e tenta acessar /login, manda pro portal
    if (pathname === '/login' || pathname === '/') {
      const accessToken = request.cookies.get('access_token')?.value;
      if (accessToken) {
        const payload = await verifyAccessToken(accessToken);
        if (payload) {
          return comSecurityHeaders(
            NextResponse.redirect(new URL('/portal/dashboard', request.url))
          );
        }
      }
    }
    return comSecurityHeaders(NextResponse.next());
  }

  // 2. Tentar ler o access token
  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const refreshed = await tentarRefreshSilencioso(request);
    if (refreshed) return refreshed;
    return respostaNaoAutenticado(request);
  }

  // 3. Verificar assinatura e validade do JWT
  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    // Token adulterado ou expirado — tenta refresh antes de rejeitar
    const refreshed = await tentarRefreshSilencioso(request);
    if (refreshed) return refreshed;
    return respostaSessaoExpirada(request);
  }

  // 4. Token válido — injeta dados do inquilino nos headers
  //    As route handlers leem via: headers().get('x-inquilino-id')
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-inquilino-id', payload.id);
  requestHeaders.set('x-inquilino-role', payload.role);

  return comSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } })
  );
}

// ----------------------------------------------------------
// Matcher: roda em todas as rotas exceto assets estáticos
// ----------------------------------------------------------
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
