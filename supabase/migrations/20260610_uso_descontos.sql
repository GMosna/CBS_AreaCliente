-- ============================================================
-- SASSI IMÓVEIS — Tabela de registro de uso de benefícios
-- ============================================================

CREATE TABLE IF NOT EXISTS uso_descontos (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquilino_id UUID        NOT NULL,
  parceiro_id  UUID        NOT NULL,
  usado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_uso_desconto_inquilino
    FOREIGN KEY (inquilino_id) REFERENCES inquilinos(id) ON DELETE CASCADE
);

-- Índice otimizado para as consultas mais comuns:
-- "quantas vezes este inquilino usou este parceiro nos últimos N dias?"
CREATE INDEX IF NOT EXISTS idx_uso_descontos_lookup
  ON uso_descontos(inquilino_id, parceiro_id, usado_em DESC);
