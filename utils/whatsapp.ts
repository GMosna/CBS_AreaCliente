const WA_MESSAGE =
  'Olá, tudo bem?! Vim através do Clube de Benefícios da Sassi Imóveis e gostaria de saber mais sobre o desconto disponível para inquilinos.';

/** Remove tudo que não for dígito */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Constrói a URL wa.me com mensagem pré-preenchida.
 * Retorna null se o número for inválido (< 10 dígitos).
 */
export function buildWhatsAppUrl(
  phone: string,
  message: string = WA_MESSAGE
): string | null {
  const digits = sanitizePhone(phone);
  if (digits.length < 10) return null;

  // Garante prefixo 55 (Brasil) sem duplicar
  const number = digits.startsWith('55') ? digits : `55${digits}`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
