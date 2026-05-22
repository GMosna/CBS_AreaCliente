// ============================================================
// SASSI IMÓVEIS — Tipos do Sistema de Sync com Google Sheets
// ============================================================

/** Estrutura do JSON de Service Account do Google Cloud */
export type ServiceAccount = {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;     // PEM RSA private key (começa com -----BEGIN RSA PRIVATE KEY-----)
  client_email: string;    // ex: sassi-sync@project.iam.gserviceaccount.com
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
};

/** Linha bruta lida do Google Sheets — todos os campos são strings */
export type RawSheetRow = {
  nomeEmpresa: string;
  segmento: string;
  cnpj: string;
  responsavel: string;
  whatsapp: string;
  email: string;
  endereco: string;
  descontoDescricao: string;
  frequenciaDesconto: string;
  timestamp: string;
  rowIndex: number; // número da linha na planilha (1-based, excluindo header)
};

/** Dados validados e prontos para inserção no banco */
export type ParceiroInput = {
  nomeEmpresa: string;
  segmento?: string;
  cnpj: string;             // formatado: XX.XXX.XXX/XXXX-XX
  responsavel?: string;
  whatsapp?: string;        // normalizado: apenas dígitos DDD+número
  email?: string;
  endereco?: string;
  descontoDescricao: string;
  frequenciaDesconto?: string;
};

/** Resultado da validação de uma linha */
export type ValidationResult =
  | { valid: true; data: ParceiroInput }
  | { valid: false; errors: string[] };

/** Resultado de um sync completo */
export type SyncResult = {
  totalLinhas: number;
  inseridos: number;
  atualizados: number;
  erros: number;
  status: 'success' | 'partial' | 'error';
};

/** Detalhe de um erro em linha específica */
export type SyncErroDetalhe = {
  row: number;
  cnpj?: string;
  erros: string[];
};

/** Registro na tabela sync_logs */
export type SyncLog = {
  id: string;
  total_linhas: number;
  inseridos: number;
  atualizados: number;
  erros: number;
  erros_detalhes: SyncErroDetalhe[] | null;
  duracao_ms: number;
  status: 'success' | 'partial' | 'error';
  created_at: string;
};

/** Payload do insert em sync_logs */
export type SyncLogInsert = Omit<SyncLog, 'id' | 'created_at'>;
