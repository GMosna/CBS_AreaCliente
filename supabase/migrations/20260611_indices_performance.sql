-- Índice composto para refresh token rotation (3 colunas usadas no WHERE do UPDATE atômico)
-- Antes: index scan em token_hash + filter em memória para revogado e expires_at
-- Depois: index scan cobre as 3 condições diretamente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_rotation
  ON refresh_tokens(token_hash, revogado, expires_at)
  WHERE revogado = false;

-- Índice composto para contagem de falhas por IP no rate limiting
-- Query: WHERE ip_address = ? AND sucesso = false AND created_at >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_attempts_rate_limit
  ON login_attempts(ip_address, sucesso, created_at DESC)
  WHERE sucesso = false;

-- Índice parcial para consultas de refresh tokens não revogados
-- Reduz o tamanho efetivo do índice (ignora tokens já revogados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_ativos
  ON refresh_tokens(inquilino_id, expires_at DESC)
  WHERE revogado = false;
