// ============================================================
// SASSI IMÓVEIS — Lógica de frequência de uso de benefícios
//
// Sem dependência de banco — recebe timestamps já buscados.
// ============================================================

export type FrequenciaConfig =
  | { tipo: 'ilimitado' }
  | { tipo: 'unico' }
  | { tipo: 'periodo'; diasJanela: number; limiteUsos: number };

export type DisponibilidadeResult =
  | { disponivel: true }
  | { disponivel: false; mensagem: string; proximoUsoEm?: Date };

/**
 * Converte o texto livre do campo frequencia_desconto em uma config tipada.
 * Exemplos aceitos: "Ilimitado", "Uso único", "1x por mês", "2 vezes por semana",
 * "Mensal", "Semanal", "Trimestral", "1x/semana", etc.
 */
// Retorna true para frequências que eram "sem limite" — agora tratadas como 1/dia
export function isIlimitado(texto: string | null | undefined): boolean {
  if (!texto?.trim()) return true;
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return ['ilimitado', 'valido sempre', 'sem limite', 'livre'].includes(t);
}

export function parseFrequencia(texto: string | null | undefined): FrequenciaConfig {
  // Regra de negócio: "ilimitado" e ausência de frequência = 1 uso por dia
  if (!texto?.trim()) return { tipo: 'periodo', diasJanela: 1, limiteUsos: 1 };

  // Normaliza: minúsculas + remove acentos
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

  if (t.includes('ilimitado') || t.includes('sem limite') || t.includes('valido sempre') || t === 'livre') {
    return { tipo: 'periodo', diasJanela: 1, limiteUsos: 1 };
  }

  if (
    t.includes('uso unico') ||
    t.includes('uma vez') && t.includes('total') ||
    t.includes('1 uso') ||
    t === 'unico'
  ) {
    return { tipo: 'unico' };
  }

  // "2x por mês", "2 vezes por mes", "2x/semana", "2 por trimestre"
  const match = t.match(/(\d+)\s*(?:x|vez(?:es)?|usos?)?\s*(?:por|a cada|\/)\s*(dia|semana|mes|trimest|ano)/);
  if (match) {
    const limiteUsos = parseInt(match[1], 10);
    const periodo = match[2];
    return { tipo: 'periodo', diasJanela: diasDoPeriodo(periodo), limiteUsos };
  }

  // Atalhos sem número explícito (subentendido 1x)
  if (t.includes('diario') || t.includes('diaria') || t === 'dia') {
    return { tipo: 'periodo', diasJanela: 1, limiteUsos: 1 };
  }
  if (t.includes('semana') || t.includes('semanal')) {
    return { tipo: 'periodo', diasJanela: 7, limiteUsos: 1 };
  }
  if (t.includes('quinzenal') || t.includes('quinzena')) {
    return { tipo: 'periodo', diasJanela: 15, limiteUsos: 1 };
  }
  if (t.includes('mes') || t.includes('mensal')) {
    return { tipo: 'periodo', diasJanela: 30, limiteUsos: 1 };
  }
  if (t.includes('trimest')) {
    return { tipo: 'periodo', diasJanela: 90, limiteUsos: 1 };
  }
  if (t.includes('semest')) {
    return { tipo: 'periodo', diasJanela: 180, limiteUsos: 1 };
  }
  if (t.includes('anual') || t.includes('ano')) {
    return { tipo: 'periodo', diasJanela: 365, limiteUsos: 1 };
  }

  return { tipo: 'periodo', diasJanela: 1, limiteUsos: 1 };
}

function diasDoPeriodo(periodo: string): number {
  if (periodo.startsWith('dia')) return 1;
  if (periodo.startsWith('semana')) return 7;
  if (periodo.startsWith('mes') || periodo.startsWith('mês')) return 30;
  if (periodo.startsWith('trimest')) return 90;
  if (periodo.startsWith('ano')) return 365;
  return 30;
}

/**
 * Verifica disponibilidade com base nos usos já buscados do banco.
 * @param config   - Configuração de frequência do parceiro
 * @param usos     - Array de ISO timestamps dos usos anteriores (já filtrado por inquilino+parceiro)
 */
export function estaDisponivel(
  config: FrequenciaConfig,
  usos: string[],
): DisponibilidadeResult {
  if (config.tipo === 'ilimitado') return { disponivel: true };

  if (config.tipo === 'unico') {
    if (usos.length === 0) return { disponivel: true };
    return { disponivel: false, mensagem: 'Este benefício já foi utilizado anteriormente.' };
  }

  // Período: janela deslizante de N dias
  const agora = new Date();
  const inicio = new Date(agora);
  inicio.setDate(inicio.getDate() - config.diasJanela);

  const usosNaJanela = usos.filter(u => new Date(u) >= inicio);

  if (usosNaJanela.length >= config.limiteUsos) {
    // O mais antigo na janela define quando o próximo slot abre
    const sorted = [...usosNaJanela].sort();
    const maisAntigo = new Date(sorted[0]);
    const proximoUsoEm = new Date(maisAntigo);
    proximoUsoEm.setDate(proximoUsoEm.getDate() + config.diasJanela);

    return {
      disponivel: false,
      mensagem: mensagemBloqueio(config),
      proximoUsoEm,
    };
  }

  return { disponivel: true };
}

export function mensagemBloqueio(config: FrequenciaConfig): string {
  if (config.tipo === 'unico') return 'Este benefício já foi utilizado anteriormente.';
  if (config.tipo === 'ilimitado') return '';

  const periodo =
    config.diasJanela === 1  ? 'hoje' :
    config.diasJanela === 7  ? 'nesta semana' :
    config.diasJanela === 15 ? 'nesta quinzena' :
    config.diasJanela === 30 ? 'neste mês' :
    config.diasJanela === 90 ? 'neste trimestre' :
    `nos últimos ${config.diasJanela} dias`;

  return `Você já utilizou este benefício ${config.limiteUsos}x ${periodo}.`;
}
