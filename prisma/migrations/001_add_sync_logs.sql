-- ============================================================
-- Migração: Criar tabela sync_logs
-- Executar no Supabase SQL Editor: Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  total_linhas  INT          NOT NULL,
  inseridos     INT          NOT NULL,
  atualizados   INT          NOT NULL,
  erros         INT          NOT NULL,
  erros_detalhes JSONB,
  duracao_ms    INT          NOT NULL,
  status        VARCHAR(20)  NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at
  ON sync_logs (created_at DESC);

-- Row Level Security: apenas service_role acessa
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy pública — apenas o service_role key (backend) tem acesso
-- O client anon key NÃO consegue ler/escrever nesta tabela
