-- ============================================================
-- SASSI IMÓVEIS — Funções PostgreSQL auxiliares
--
-- COMO USAR:
--   Cole e execute no Supabase SQL Editor (projeto > SQL Editor).
-- ============================================================

-- Conta quantos inquilinos distintos já fizeram login ao menos uma vez.
-- Usado no card "Clientes" do dashboard.
CREATE OR REPLACE FUNCTION contar_inquilinos_logados()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(DISTINCT inquilino_id)
  FROM audit_logs
  WHERE acao = 'login_success'
    AND inquilino_id IS NOT NULL;
$$;
