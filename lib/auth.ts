// ============================================================
// SASSI IMÓVEIS — Funções de Autenticação
//
// ⚠️  Este arquivo roda APENAS em API Routes (Node.js runtime).
//     Não importar no middleware (edge runtime).
// ============================================================

import * as crypto from 'crypto';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import type { TokenPayload } from '@/types/auth';

// ============================================================
// CPF — Hash e Comparação
//
// Usamos HMAC-SHA256 (não bcrypt) porque o CPF é um
// identificador que precisa de lookup no banco por índice.
// bcrypt é não-determinístico (salt aleatório) — impossível
// fazer WHERE cpf = $hash com ele.
// O CPF_SECRET_KEY mantém o hash irreversível mesmo se o
// banco for comprometido.
// ============================================================

/** Gera HMAC-SHA256 do CPF. Sempre produz o mesmo resultado para o mesmo CPF+chave. */
export function hashCPF(cpf: string): string {
  // .trim() remove espaços/newlines que o Vercel às vezes insere no valor da env var.
  // replace() troca aspas tipográficas por aspas normais (copiar/colar de documentos).
  const secret = (process.env.CPF_SECRET_KEY ?? '')
    .trim()
    .replace(/[‘’“”]/g, "'");
  return crypto
    .createHmac('sha256', secret)
    .update(cpf)
    .digest('hex');
}

/**
 * Compara CPF raw com o hash armazenado no banco.
 * Usa timingSafeEqual para evitar timing attacks
 * (ataques que medem o tempo de resposta para descobrir dados).
 */
export function compareCPF(cpfRaw: string, storedHash: string): boolean {
  const computed = hashCPF(cpfRaw);

  // Garantir mesmo tamanho antes de comparar (exigido pelo timingSafeEqual)
  if (computed.length !== storedHash.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(storedHash)
  );
}

// ============================================================
// ACCESS TOKEN — JWT de curta duração (15 minutos)
// ============================================================

/** Codifica a chave JWT_SECRET em bytes para o jose */
function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

/**
 * Gera um JWT assinado com HS256.
 * Payload contém apenas id e role — mínimo necessário.
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ id: payload.id, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()                   // iat = agora
    .setExpirationTime('15m')        // exp = agora + 15 minutos
    .sign(getJwtSecret());
}

// ============================================================
// REFRESH TOKEN — Token opaco de longa duração (7 dias)
//
// Estratégia:
//   - Geramos um token aleatório (128 chars hex = 64 bytes)
//   - Enviamos o token RAW ao browser como cookie HttpOnly
//   - Armazenamos apenas o SHA-256 do token no banco
//   - Se o banco vazar, os hashes são inúteis sem o token raw
// ============================================================

/** Gera um token aleatório de 128 caracteres hexadecimais */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/** SHA-256 do token raw — é o que vai para o banco */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// COOKIES — Configuração e Gerenciamento
//
// access_token  → Path=/portal  (só enviado em rotas do portal)
// refresh_token → Path=/api/auth/refresh  (só enviado nesta rota)
//
// Isso limita a exposição: o refresh_token nunca é enviado
// automaticamente para rotas de negócio, só para renovação.
// ============================================================

const IS_PROD = process.env.NODE_ENV === 'production';

/** Seta os dois cookies de autenticação na response */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  // Access token: válido por 15 minutos.
  // path='/' permite que o browser o envie tanto para /portal/* quanto para
  // /api/portal/*. A proteção CSRF é garantida pelo sameSite:'strict' e httpOnly.
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,                   // JavaScript do browser NÃO consegue ler
    secure: IS_PROD,                  // HTTPS apenas em produção
    sameSite: 'strict',               // nunca enviado em requisições cross-site
    path: '/',                        // necessário para /api/portal/* também funcionar
    maxAge: 900,                      // 15 minutos em segundos
  });

  // Refresh token: válido por 7 dias, só em /api/auth/refresh
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/api/auth/refresh',        // só enviado para esta rota específica
    maxAge: 60 * 60 * 24 * 7,        // 7 dias em segundos
  });
}

/** Remove os cookies de autenticação (logout) */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,                        // maxAge=0 instrui o browser a deletar
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 0,
  });
}
