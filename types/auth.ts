// ============================================================
// SASSI IMÓVEIS — Tipos de Autenticação
// ============================================================

/** Dados que ficam dentro do JWT (access token) */

export type TokenPayload = {
  id: string;          // UUID do inquilino
  role: 'inquilino';   // sempre 'inquilino' por enquanto
  iat?: number;        // issued at (gerado pelo jose automaticamente)
  exp?: number;        // expires at (gerado pelo jose automaticamente)
};

/** Resultado da verificação de rate limit */
export type RateLimitResult = {
  allowed: boolean;             // true = pode tentar, false = bloqueado
  remainingAttempts: number;    // quantas tentativas restam antes de bloquear
  blockedUntil?: Date;          // quando o bloqueio vai terminar (se bloqueado)
};

/** Ações possíveis no log de auditoria — deve espelhar o ENUM do banco */
export type AuditAcao =
  | 'login_success'
  | 'login_fail'
  | 'login_bloqueado'
  | 'logout'
  | 'token_refresh'
  | 'visualizou_parceiro'
  | 'copiou_desconto'
  | 'preferencia_atualizada'
  | 'visualizou_cupom_fisico'
  | 'baixou_cupom'
  | 'copiou_codigo_online'
  | 'acessou_loja_online'
  | 'clicou_whatsapp';

/** Body esperado na requisição POST /api/auth/login */
export type LoginRequest = {
  cpf: string;            // 11 dígitos sem máscara
  dataNascimento: string; // formato YYYY-MM-DD
};

/** Resposta de sucesso do login — NUNCA incluir tokens aqui */
export type LoginResponse = {
  nome: string;
};

/** Dados do inquilino autenticado — colocado nos headers pelo middleware */
export type InquilinoAutenticado = {
  id: string;
  role: 'inquilino';
};
