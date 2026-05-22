export type TipoNotificacao = 'info' | 'aviso' | 'urgente';

export const TIPO_NOTIFICACAO_LABELS: Record<TipoNotificacao, string> = {
  info:    'Informação',
  aviso:   'Aviso',
  urgente: 'Urgente',
};

export type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criada_em: string; // ISO 8601
};
