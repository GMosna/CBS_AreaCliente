// Tipo que espelha as colunas snake_case retornadas pelo Supabase
export type ParceiroDb = {
  id: string;
  cnpj: string;
  nome_empresa: string;
  segmento: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  desconto_descricao: string;
  frequencia_desconto: string | null;
  logo_url: string | null;
  ativo: boolean;
  aprovado: boolean;
  destaque: boolean;
  origem: string;
  created_at: string;
};

// Subconjunto retornado nas listagens (sem dados sensíveis de contato)
export type ParceiroListItem = Pick<
  ParceiroDb,
  | 'id'
  | 'nome_empresa'
  | 'segmento'
  | 'desconto_descricao'
  | 'frequencia_desconto'
  | 'logo_url'
  | 'destaque'
  | 'whatsapp'
  | 'created_at'
>;

// Tipo legado mantido para compatibilidade com types/parceiro (design system)
export type CategoriaParceiro =
  | 'saude'
  | 'educacao'
  | 'alimentacao'
  | 'lazer'
  | 'servicos'
  | 'tecnologia'
  | 'moda'
  | 'outros';

export const CATEGORIA_LABELS: Record<CategoriaParceiro, string> = {
  saude:       'Saúde',
  educacao:    'Educação',
  alimentacao: 'Alimentação',
  lazer:       'Lazer',
  servicos:    'Serviços',
  tecnologia:  'Tecnologia',
  moda:        'Moda',
  outros:      'Outros',
};
