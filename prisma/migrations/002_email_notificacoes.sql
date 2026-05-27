-- ============================================================
-- SASSI IMÓVEIS — Migração 002
-- Adiciona suporte a notificações por e-mail:
--   1. Coluna email_notificacoes em inquilinos (opt-in)
--   2. Coluna email em inquilinos (endereço fornecido pelo próprio inquilino)
--   3. Valor 'novo_parceiro' no enum de tipo de notificação (se existir enum)
--   4. Valor 'preferencia_atualizada' no enum de ação de auditoria
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- 1. Preferência de e-mail (opt-in, default false)
ALTER TABLE inquilinos
  ADD COLUMN IF NOT EXISTS email_notificacoes BOOLEAN NOT NULL DEFAULT false;

-- 2. E-mail informado pelo próprio inquilino (distinto do e-mail do ERP)
ALTER TABLE inquilinos
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Novo tipo de notificação (execute apenas se usar ENUM no banco)
-- Se o tipo for TEXT, ignore este bloco — o valor já é aceito.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'tipo_notificacao'
  ) THEN
    ALTER TYPE tipo_notificacao ADD VALUE IF NOT EXISTS 'novo_parceiro';
  END IF;
END
$$;

-- 4. Nova ação de auditoria (execute apenas se usar ENUM no banco)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'audit_acao'
  ) THEN
    ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'preferencia_atualizada';
  END IF;
END
$$;
