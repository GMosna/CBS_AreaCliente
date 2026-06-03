// ============================================================
// SASSI IMÓVEIS — Serviço de Sincronização Google Sheets → PostgreSQL
//
// ⚠️  Roda APENAS em Node.js runtime (API Routes).
//     Não importar no middleware (Edge).
//
// Autenticação com Google via JWT RS256 — sem dependências externas.
// O crypto nativo do Node assina o JWT com a chave privada da Service Account.
// ============================================================

import crypto from 'crypto';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { resolveLogoUrl } from '@/utils/logo';
import { enviarEmailNovoLead } from './email';
import type {
  ServiceAccount,
  RawSheetRow,
  ValidationResult,
  SyncResult,
  SyncLog,
  SyncLogInsert,
  SyncErroDetalhe,
  ParceiroInput,
} from '@/types/sheets';

// ----------------------------------------------------------
// Limites de segurança
// ----------------------------------------------------------
const MAX_ROWS = 500;
const TIMEOUT_MS = 30_000;

// ============================================================
// GOOGLE AUTH — JWT RS256 sem pacotes externos
//
// Fluxo:
//   1. Montar header + payload do JWT
//   2. Assinar com chave privada RSA da Service Account (RS256)
//   3. Trocar o JWT por um access_token na API do Google
// ============================================================

function buildGoogleJWT(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(sa.private_key, 'base64url');

  return `${header}.${payload}.${signature}`;
}

async function exchangeJWTForToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // Nunca logar o corpo completo — pode conter info da service account
    throw new Error(`Google OAuth falhou com status ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ============================================================
// VALIDAÇÃO — CNPJ (algoritmo dos dígitos verificadores)
// ============================================================

function validarCNPJ(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');

  if (digits.length !== 14) return false;
  // Rejeita sequências como 00000000000000, 11111111111111, etc.
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigito = (base: string, pesos: number[]): number => {
    const soma = base
      .split('')
      .reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigito(digits.slice(0, 12), p1);
  const d2 = calcDigito(digits.slice(0, 13), p2);

  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
}

// Converte timestamp do Google Forms (DD/MM/YYYY HH:MM:SS ou ISO) para ISO string
function parsarTimestamp(raw: string): string | null {
  if (!raw) return null;
  // Formato brasileiro: "23/05/2026 09:24:32" ou "23/05/2026, 09:24:32"
  const br = raw.replace(',', '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (br) {
    const [, d, m, y, h, min, s] = br;
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}-03:00`).toISOString();
  }
  // Tenta parse direto (ISO ou outro formato reconhecido)
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function formatarCNPJ(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

// ============================================================
// VALIDAÇÃO — WhatsApp brasileiro
//
// Aceita: com ou sem +55, com ou sem parênteses/traços
// Normaliza para: apenas dígitos, DDD + número (10 ou 11 dígitos)
// ============================================================

function normalizarWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Remove código do país 55 se presente (13 dígitos = 55 + DDD + 9 dígitos)
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith('55')) return digits.slice(2);
  return digits;
}

// ============================================================
// SCHEMA ZOD — Validação de cada linha da planilha
// ============================================================

const rowSchema = z.object({
  nomeEmpresa: z
    .string()
    .min(2, 'Nome da empresa deve ter mínimo 2 caracteres')
    .transform((s) => s.trim()),

  segmento: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  cnpj: z
    .string()
    .min(1, 'CNPJ é obrigatório')
    .transform((s) => s.replace(/\D/g, ''))
    .refine((s) => s.length === 14, 'CNPJ deve ter 14 dígitos')
    .refine(validarCNPJ, 'CNPJ inválido — dígitos verificadores incorretos')
    .transform(formatarCNPJ),

  responsavel: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  whatsapp: z
    .string()
    .optional()
    .transform((s) => (s ? normalizarWhatsApp(s) : undefined))
    .refine(
      (w) => !w || /^[1-9]\d{9,10}$/.test(w),
      'WhatsApp inválido — informe DDD + número (10 ou 11 dígitos)'
    ),

  email: z
    .string()
    .optional()
    .transform((s) => s?.trim().toLowerCase() || undefined)
    .pipe(z.string().email('E-mail inválido').optional()),

  endereco: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  descontoDescricao: z
    .string()
    .min(1, 'Descrição do desconto é obrigatória')
    .transform((s) => s.trim()),

  frequenciaDesconto: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  percentualDesconto: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  siteInstagram: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  logoUrl: z
    .string()
    .optional()
    .transform((s) => resolveLogoUrl(s?.trim()) ?? undefined),

  mensagem: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  tipoLoja: z
    .string()
    .optional()
    .transform((s) => {
      const v = s?.trim().toLowerCase() || 'fisica';
      if (v === 'online' || v === 'ambos') return v as 'online' | 'ambos';
      return 'fisica' as const;
    }),

  codigoCupom: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),

  urlLoja: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined),
});

// ============================================================
// CLASSE PRINCIPAL
// ============================================================

export class SheetsSyncService {
  private readonly supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ----------------------------------------------------------
  // Lê e valida a Service Account do ambiente.
  // NUNCA loga o objeto retornado.
  // ----------------------------------------------------------
  private getServiceAccount(): ServiceAccount {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurado');

    let sa: ServiceAccount;
    try {
      sa = JSON.parse(raw) as ServiceAccount;
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON contém JSON inválido');
    }

    if (sa.type !== 'service_account' || !sa.client_email || !sa.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é uma Service Account válida');
    }

    return sa;
  }

  // ----------------------------------------------------------
  // 1. Autenticar com Google Sheets API v4
  //    Retorna um access token válido por 1 hora
  // ----------------------------------------------------------
  async authenticate(): Promise<string> {
    const sa = this.getServiceAccount();
    const jwt = buildGoogleJWT(sa);
    return exchangeJWTForToken(jwt);
  }

  // ----------------------------------------------------------
  // 2. Buscar todas as linhas da planilha
  // ----------------------------------------------------------
  async fetchRows(): Promise<RawSheetRow[]> {
    const sheetsId = process.env.SHEETS_ID;
    if (!sheetsId) throw new Error('SHEETS_ID não configurado no .env');

    const token = await this.authenticate();

    // Lê especificamente da aba "Inscrições", colunas A até S (19 colunas)
    // P=15 Tipo de Loja | Q=16 Código do Cupom | R=17 Status (ignorado) | S=18 URL da Loja (futuro)
    const range = encodeURIComponent('Inscrições!A:S');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${range}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Sheets API retornou status ${response.status}`);
    }

    const body = (await response.json()) as { values?: string[][] };
    const allRows = body.values ?? [];

    if (allRows.length <= 1) return []; // sem dados ou só header

    // Primeira linha é o header — pular
    const dataRows = allRows.slice(1, MAX_ROWS + 1);

    return dataRows.map((cells, index): RawSheetRow => ({
      nomeEmpresa:        (cells[0]  ?? '').trim(),
      segmento:           (cells[1]  ?? '').trim(),
      cnpj:               (cells[2]  ?? '').trim(),
      responsavel:        (cells[3]  ?? '').trim(),
      whatsapp:           (cells[4]  ?? '').trim(),
      email:              (cells[5]  ?? '').trim(),
      endereco:           (cells[6]  ?? '').trim(),
      descontoDescricao:  (cells[7]  ?? '').trim(),
      frequenciaDesconto: (cells[8]  ?? '').trim(),
      percentualDesconto: (cells[9]  ?? '').trim(),
      siteInstagram:      (cells[10] ?? '').trim(),
      comoConheceu:       (cells[11] ?? '').trim(),
      logoUrl:            (cells[12] ?? '').trim(),
      mensagem:           (cells[13] ?? '').trim(),
      timestamp:          (cells[14] ?? '').trim(),
      tipoLoja:           (cells[15] ?? '').trim(), // coluna P — Tipo de Loja
      codigoCupom:        (cells[16] ?? '').trim(), // coluna Q — Código do Cupom
      // cells[17] = coluna R — Status (ignorado no sync)
      urlLoja:            (cells[18] ?? '').trim(), // coluna S — URL da Loja (a adicionar na planilha)
      rowIndex:           index + 2,
    }));
  }

  // ----------------------------------------------------------
  // 3. Validar uma linha com Zod + regras de negócio
  // ----------------------------------------------------------
  validateRow(row: RawSheetRow): ValidationResult {
    const result = rowSchema.safeParse({
      nomeEmpresa:        row.nomeEmpresa,
      segmento:           row.segmento           || undefined,
      cnpj:               row.cnpj,
      responsavel:        row.responsavel         || undefined,
      whatsapp:           row.whatsapp            || undefined,
      email:              row.email               || undefined,
      endereco:           row.endereco            || undefined,
      descontoDescricao:  row.descontoDescricao,
      frequenciaDesconto: row.frequenciaDesconto  || undefined,
      percentualDesconto: row.percentualDesconto  || undefined,
      siteInstagram:      row.siteInstagram       || undefined,
      logoUrl:            row.logoUrl             || undefined,
      mensagem:           row.mensagem            || undefined,
      tipoLoja:           row.tipoLoja            || undefined,
      codigoCupom:        row.codigoCupom         || undefined,
      urlLoja:            row.urlLoja             || undefined,
    });

    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map(
          (e) => `[${e.path.join('.') || 'campo'}] ${e.message}`
        ),
      };
    }

    return { valid: true, data: result.data as ParceiroInput };
  }

  // ----------------------------------------------------------
  // 4. Sincronizar planilha → banco de dados
  //
  //    Lógica:
  //      - CNPJ existente → UPDATE (mantém aprovado atual)
  //      - CNPJ novo      → INSERT com aprovado = false
  //    Registra resultado em sync_logs.
  // ----------------------------------------------------------
  async syncToDatabase(): Promise<SyncResult> {
    const startedAt = Date.now();
    const errosDetalhes: SyncErroDetalhe[] = [];
    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;

    // --- Buscar linhas da planilha ---
    let rows: RawSheetRow[];
    try {
      rows = await this.fetchRows();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar planilha';
      await this.registrarLog({
        total_linhas: 0, inseridos: 0, atualizados: 0, erros: 1,
        erros_detalhes: [{ row: 0, erros: [msg] }],
        duracao_ms: Date.now() - startedAt,
        status: 'error',
      });
      return { totalLinhas: 0, inseridos: 0, atualizados: 0, erros: 1, status: 'error' };
    }

    const totalLinhas = rows.length;

    // --- Processar cada linha ---
    for (const row of rows) {
      const validation = this.validateRow(row);

      if (!validation.valid) {
        erros++;
        errosDetalhes.push({ row: row.rowIndex, cnpj: row.cnpj || undefined, erros: validation.errors });
        continue;
      }

      const input = validation.data;

      try {
        // Verificar se CNPJ já existe no banco
        const { data: existing } = await this.supabase
          .from('parceiros')
          .select('id, aprovado')
          .eq('cnpj', input.cnpj)
          .maybeSingle();

        if (existing) {
          // UPDATE — preserva o campo 'aprovado' atual (não resetar para false)
          const { error } = await this.supabase
            .from('parceiros')
            .update({
              nome_empresa:        input.nomeEmpresa,
              segmento:            input.segmento            ?? null,
              responsavel:         input.responsavel          ?? null,
              whatsapp:            input.whatsapp             ?? null,
              email:               input.email                ?? null,
              endereco:            input.endereco             ?? null,
              desconto_descricao:  input.descontoDescricao,
              frequencia_desconto: input.frequenciaDesconto   ?? null,
              percentual_desconto: input.percentualDesconto   ?? null,
              site_instagram:      input.siteInstagram        ?? null,
              logo_url:            input.logoUrl              ?? null,
              mensagem:            input.mensagem             ?? null,
              tipo_loja:           input.tipoLoja             ?? 'fisica',
              codigo_cupom:        input.codigoCupom          ?? null,
              url_loja:            input.urlLoja              ?? null,
              data_cadastro:       parsarTimestamp(row.timestamp),
              sheets_row_id:       String(row.rowIndex),
            })
            .eq('id', existing.id);

          if (error) throw new Error(error.message);
          atualizados++;
        } else {
          // INSERT — aprovado: false SEMPRE (nunca auto-aprovado)
          const { error } = await this.supabase
            .from('parceiros')
            .insert({
              nome_empresa:        input.nomeEmpresa,
              cnpj:                input.cnpj,
              segmento:            input.segmento            ?? null,
              responsavel:         input.responsavel          ?? null,
              whatsapp:            input.whatsapp             ?? null,
              email:               input.email                ?? null,
              endereco:            input.endereco             ?? null,
              desconto_descricao:  input.descontoDescricao,
              frequencia_desconto: input.frequenciaDesconto   ?? null,
              percentual_desconto: input.percentualDesconto   ?? null,
              site_instagram:      input.siteInstagram        ?? null,
              logo_url:            input.logoUrl              ?? null,
              mensagem:            input.mensagem             ?? null,
              tipo_loja:           input.tipoLoja             ?? 'fisica',
              codigo_cupom:        input.codigoCupom          ?? null,
              url_loja:            input.urlLoja              ?? null,
              data_cadastro:       parsarTimestamp(row.timestamp),
              sheets_row_id:       String(row.rowIndex),
              origem:              'sheets',
              aprovado:            false,
              ativo:               true,
            });

          if (error) throw new Error(error.message);
          inseridos++;

          // Notificar admin com link de aprovação (fire and forget)
          const approvalSecret = process.env.APPROVAL_SECRET;
          if (approvalSecret) {
            const cnpjDigits  = input.cnpj.replace(/\D/g, '');
            const token       = crypto.createHmac('sha256', approvalSecret).update(cnpjDigits).digest('base64url');
            const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clube.sassiimoveis.com.br';
            const approvalUrl = `${appUrl}/api/admin/parceiros/aprovar?cnpj=${encodeURIComponent(input.cnpj)}&token=${token}`;

            enviarEmailNovoLead({
              nomeParceiro: input.nomeEmpresa,
              cnpj:         input.cnpj,
              segmento:     input.segmento,
              responsavel:  input.responsavel,
              whatsapp:     input.whatsapp,
              approvalUrl,
            }).catch((err) => {
              console.error('[sheets-sync] Falha ao enviar e-mail de lead ao admin:', err);
            });
          }
        }
      } catch (err) {
        erros++;
        errosDetalhes.push({
          row: row.rowIndex,
          cnpj: input.cnpj,
          erros: [err instanceof Error ? err.message : 'Erro desconhecido no banco'],
        });
      }
    }

    const duracaoMs = Date.now() - startedAt;
    const status: SyncResult['status'] =
      erros === 0         ? 'success' :
      erros === totalLinhas ? 'error'   :
                             'partial';

    await this.registrarLog({
      total_linhas: totalLinhas,
      inseridos,
      atualizados,
      erros,
      erros_detalhes: errosDetalhes.length > 0 ? errosDetalhes : null,
      duracao_ms: duracaoMs,
      status,
    });

    return { totalLinhas, inseridos, atualizados, erros, status };
  }

  // ----------------------------------------------------------
  // 5. Histórico dos últimos 10 syncs
  // ----------------------------------------------------------
  async getSyncReport(): Promise<SyncLog[]> {
    const { data, error } = await this.supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    return (data ?? []) as SyncLog[];
  }

  // ----------------------------------------------------------
  // Registrar resultado do sync na tabela sync_logs
  // ----------------------------------------------------------
  private async registrarLog(entry: SyncLogInsert): Promise<void> {
    const { error } = await this.supabase.from('sync_logs').insert(entry);
    if (error) {
      // Falha silenciosa no log — não bloquear o retorno do sync
      console.error('[sheets-sync] Falha ao registrar sync_log:', error.message);
    }
  }
}
