ALTER TABLE parceiros
  ADD COLUMN IF NOT EXISTS tipo_loja VARCHAR(20) DEFAULT 'fisica',
  ADD COLUMN IF NOT EXISTS codigo_cupom VARCHAR(100),
  ADD COLUMN IF NOT EXISTS url_loja VARCHAR(500);

COMMENT ON COLUMN parceiros.tipo_loja IS 'Tipo de loja: fisica, online ou ambos';
COMMENT ON COLUMN parceiros.codigo_cupom IS 'Código de cupom de desconto para uso online ou físico';
COMMENT ON COLUMN parceiros.url_loja IS 'URL da loja online para redirecionar o inquilino';
