export type TipoNotificacao = 'info' | 'aviso' | 'urgente' | 'novo_parceiro';

export const TIPO_NOTIFICACAO_LABELS: Record<TipoNotificacao, string> = {
  info:          'Informação',
  aviso:         'Aviso',
  urgente:       'Urgente',
  novo_parceiro: 'Novo Parceiro',
};

export type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criada_em: string; // ISO 8601
};
