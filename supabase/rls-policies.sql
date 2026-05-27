-- ============================================================
-- SASSI IMÓVEIS — Row Level Security (RLS) para todas as tabelas
--
-- COMO USAR:
--   Cole e execute no Supabase SQL Editor (projeto > SQL Editor).
--   O service_role bypassa o RLS automaticamente — nenhuma alteração
--   necessária nas API routes (todas usam service_role).
--
-- OBJETIVO:
--   Bloquear qualquer acesso via chave anon (pública) às tabelas
--   sensíveis. Se a chave anon vazar ou for chamada diretamente,
--   o banco recusa. Apenas o server-side (service_role) acessa.
-- ============================================================

-- ── Habilitar RLS ──────────────────────────────────────────────

ALTER TABLE inquilinos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parceiros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes     ENABLE ROW LEVEL SECURITY;

-- ── Políticas de negação explícita ────────────────────────────
--
-- Com RLS ativo e sem policies permissivas, o Supabase já nega
-- por padrão. Adicionamos políticas USING (false) como camada
-- extra de clareza e auditabilidade — é imediatamente óbvio
-- para qualquer pessoa que ler o schema que o acesso é bloqueado.
--
-- service_role bypassa TODAS as políticas — não é afetado.
-- ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──

-- Dados pessoais dos inquilinos: acesso exclusivo via server-side
CREATE POLICY "bloquear_acesso_direto" ON inquilinos
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Sessões ativas: nunca expostas por API direta
CREATE POLICY "bloquear_acesso_direto" ON refresh_tokens
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Logs de auditoria: imutáveis via API direta
CREATE POLICY "bloquear_acesso_direto" ON audit_logs
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Tentativas de login: dados de rate limiting, não públicos
CREATE POLICY "bloquear_acesso_direto" ON login_attempts
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Parceiros: gerenciados exclusivamente via admin server-side
CREATE POLICY "bloquear_acesso_direto" ON parceiros
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Histórico de sincronizações: interno
CREATE POLICY "bloquear_acesso_direto" ON sync_logs
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- Notificações: acessadas apenas via API autenticada server-side
CREATE POLICY "bloquear_acesso_direto" ON notificacoes
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- ── Verificar resultado ────────────────────────────────────────
-- Execute este SELECT para confirmar que o RLS está ativo:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Todas as tabelas acima devem ter rowsecurity = true.
-- ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
