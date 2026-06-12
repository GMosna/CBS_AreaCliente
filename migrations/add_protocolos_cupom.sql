-- Migration: tabela de protocolos de resgate, numerados sequencialmente por parceiro
-- Rodar no Supabase SQL Editor ou via psql com DIRECT_URL

CREATE TABLE IF NOT EXISTS protocolos_cupom (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uso_id          UUID        NOT NULL REFERENCES uso_descontos(id) ON DELETE CASCADE,
  parceiro_id     UUID        NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  inquilino_id    UUID        NOT NULL REFERENCES inquilinos(id) ON DELETE CASCADE,
  numero_protocolo INTEGER    NOT NULL,
  gerado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(parceiro_id, numero_protocolo)
);

CREATE INDEX IF NOT EXISTS idx_protocolos_parceiro  ON protocolos_cupom(parceiro_id, numero_protocolo);
CREATE INDEX IF NOT EXISTS idx_protocolos_inquilino ON protocolos_cupom(inquilino_id);
CREATE INDEX IF NOT EXISTS idx_protocolos_uso       ON protocolos_cupom(uso_id);

-- Retorna o próximo número sequencial para o parceiro (sem lock, aceita UNIQUE como proteção)
CREATE OR REPLACE FUNCTION proximo_protocolo(p_parceiro_id UUID)
RETURNS INTEGER AS $$
DECLARE
  proximo INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_protocolo), 0) + 1
  INTO proximo
  FROM protocolos_cupom
  WHERE parceiro_id = p_parceiro_id;
  RETURN proximo;
END;
$$ LANGUAGE plpgsql;
