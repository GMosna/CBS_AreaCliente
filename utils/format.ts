export function formatarFrequencia(frequencia: string | null | undefined): string {
  if (!frequencia || frequencia.trim() === '') return 'Consultar parceiro';
  return frequencia
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
