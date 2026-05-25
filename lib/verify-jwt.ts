// ============================================================
// SASSI IMÓVEIS — Verificação de JWT (Edge-compatible)
//
// Arquivo separado de lib/auth.ts porque o middleware roda
// em Edge Runtime, que não tem acesso ao módulo 'crypto' do
// Node.js. O jose funciona em ambos os ambientes.
// ============================================================

import { jwtVerify } from 'jose/jwt/verify';
import type { TokenPayload } from '@/types/auth';

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

/**
 * Verifica assinatura e validade do JWT.
 * Retorna o payload se válido, null se expirado ou inválido.
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TokenPayload;
  } catch {
    // Token inválido, expirado ou adulterado — silenciosamente retorna null
    return null;
  }
}
