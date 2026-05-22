/**
 * migrate_inquilinos.ts
 * Migração segura de inquilinos de CSV para o banco de dados Sassi.
 *
 * Uso:
 *   npx ts-node scripts/migrate_inquilinos.ts <caminho/para/arquivo.csv>
 *
 * Formato do CSV (com header obrigatório):
 *   cpf,nome,email,data_nascimento,imovel
 *   12345678901,João Silva,joao@email.com,15/03/1985,AP-101
 *   98765432100,Maria Souza,,1990-07-22,AP-202
 *
 * Campos:
 *   cpf             → 11 dígitos (com ou sem máscara: 000.000.000-00)
 *   nome            → nome completo
 *   email           → opcional (pode ficar em branco)
 *   data_nascimento → dd/mm/yyyy ou yyyy-mm-dd
 *   imovel          → código ou endereço (opcional)
 *
 * Variáveis de ambiente necessárias (.env):
 *   DIRECT_URL      → connection string direta do Supabase (sem pooler)
 *   CPF_SECRET_KEY  → chave secreta para HMAC-SHA256 do CPF
 *
 * Dependências:
 *   npm install csv-parse pg dotenv
 *   npm install -D @types/pg tsx
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { parse } from 'csv-parse/sync';
import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const BATCH_SIZE = 100;  // inquilinos por transação

interface InquilinoCSV {
  cpf: string;
  nome: string;
  email: string;
  data_nascimento: string;
  imovel: string;
}

interface MigrationResult {
  total: number;
  inseridos: number;
  ignorados: number;  // CPFs duplicados (ON CONFLICT DO NOTHING)
  erros: Array<{ linha: number; cpf: string; motivo: string }>;
}

// ============================================================
// FUNÇÕES DE VALIDAÇÃO E TRANSFORMAÇÃO
// ============================================================

/** Remove não-dígitos e valida que o CPF tem exatamente 11 dígitos */
function sanitizarCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) {
    throw new Error(`CPF deve ter 11 dígitos numéricos, recebeu ${digits.length}: "${raw}"`);
  }
  return digits;
}

/** Aceita dd/mm/yyyy ou yyyy-mm-dd → retorna yyyy-mm-dd */
function parseData(raw: string): string {
  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Formato de data inválido: "${raw}". Use dd/mm/yyyy ou yyyy-mm-dd.`);
  }

  const [, d, m, y] = match;
  const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida: "${raw}"`);
  }

  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Gera HMAC-SHA256 do CPF com a chave secreta → hex string de 64 chars */
function hashCPF(cpf: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(cpf).digest('hex');
}

// ============================================================
// MIGRAÇÃO
// ============================================================

async function migrarInquilinos(csvPath: string): Promise<MigrationResult> {
  const secretKey = process.env.CPF_SECRET_KEY;
  if (!secretKey || secretKey.length < 32) {
    throw new Error(
      'CPF_SECRET_KEY não definida ou muito curta (mínimo 32 caracteres). ' +
      'Configure no arquivo .env antes de migrar.'
    );
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL ou DATABASE_URL não definida no .env');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });

  const result: MigrationResult = {
    total: 0,
    inseridos: 0,
    ignorados: 0,
    erros: [],
  };

  const csvAbsoluto = path.resolve(csvPath);
  if (!fs.existsSync(csvAbsoluto)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvAbsoluto}`);
  }

  const rawCsv = fs.readFileSync(csvAbsoluto, 'utf-8');
  const rows: InquilinoCSV[] = parse(rawCsv, {
    columns: true,          // usa a primeira linha como header
    skip_empty_lines: true,
    trim: true,
    bom: true,              // remove BOM de arquivos Excel
  });

  result.total = rows.length;
  console.log(`\n📋 ${result.total} inquilino(s) encontrado(s) no CSV.`);
  console.log('   Iniciando migração...\n');

  // Processar em batches para balancear memória vs. performance
  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const linhaCSV = batchStart + i + 2; // +2: header + índice base-1

        try {
          const cpfDigits    = sanitizarCPF(row.cpf);
          const cpfHash      = hashCPF(cpfDigits, secretKey);
          const dataNasc     = parseData(row.data_nascimento);
          const email        = row.email?.trim() || null;
          const imovel       = row.imovel?.trim() || null;
          const nome         = row.nome?.trim();

          if (!nome) {
            throw new Error('Campo "nome" é obrigatório e está vazio');
          }

          const res = await client.query(
            `INSERT INTO inquilinos (cpf, nome, email, data_nascimento, imovel_referencia)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (cpf) DO NOTHING`,
            [cpfHash, nome, email, dataNasc, imovel]
          );

          if (res.rowCount === 0) {
            // CPF já existia (hash idêntico = mesmo CPF)
            result.ignorados++;
            console.log(`   ⏭  Linha ${linhaCSV}: CPF já cadastrado — ${nome}`);
          } else {
            result.inseridos++;
          }
        } catch (err) {
          result.erros.push({
            linha: linhaCSV,
            cpf: row.cpf,
            motivo: (err as Error).message,
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Progresso
    const processados = Math.min(batchStart + BATCH_SIZE, result.total);
    const pct = Math.round((processados / result.total) * 100);
    process.stdout.write(`\r   Processados: ${processados}/${result.total} (${pct}%)`);
  }

  await pool.end();
  return result;
}

// ============================================================
// CONFIRMAÇÃO ANTES DE RODAR EM PRODUÇÃO
// ============================================================

async function confirmar(pergunta: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close();
      resolve(resposta.trim().toLowerCase() === 's');
    });
  });
}

// ============================================================
// ENTRY POINT
// ============================================================

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('\nUso: npx ts-node scripts/migrate_inquilinos.ts <arquivo.csv>\n');
  console.error('Formato do CSV:');
  console.error('  cpf,nome,email,data_nascimento,imovel');
  console.error('  12345678901,João Silva,joao@email.com,15/03/1985,AP-101');
  console.error('  98765432100,Maria Souza,,1990-07-22,CASA-05\n');
  process.exit(1);
}

(async () => {
  console.log('\n====================================================');
  console.log('  SASSI IMÓVEIS — Migração de Inquilinos');
  console.log('====================================================');
  console.log(`\n  Arquivo : ${csvPath}`);
  console.log(`  Banco   : ${(process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@')}`);

  const confirmar_ok = await confirmar('\n  Continuar? [s/N] ');
  if (!confirmar_ok) {
    console.log('\n  Operação cancelada.\n');
    process.exit(0);
  }

  try {
    const resultado = await migrarInquilinos(csvPath);

    console.log('\n\n====================================================');
    console.log('  RESULTADO');
    console.log('====================================================');
    console.log(`  Total no CSV  : ${resultado.total}`);
    console.log(`  Inseridos     : ${resultado.inseridos}`);
    console.log(`  Já existiam   : ${resultado.ignorados}`);
    console.log(`  Erros         : ${resultado.erros.length}`);

    if (resultado.erros.length > 0) {
      console.warn('\n  ⚠️  ERROS ENCONTRADOS:');
      resultado.erros.forEach(({ linha, cpf, motivo }) => {
        console.warn(`     Linha ${linha} (CPF: ${cpf}): ${motivo}`);
      });

      // Salvar relatório de erros
      const relatorio = path.join(
        path.dirname(csvPath),
        `erros_migracao_${Date.now()}.csv`
      );
      const linhas = ['linha,cpf,motivo', ...resultado.erros.map(e =>
        `${e.linha},"${e.cpf}","${e.motivo.replace(/"/g, '""')}"`
      )];
      fs.writeFileSync(relatorio, linhas.join('\n'));
      console.warn(`\n  Relatório salvo: ${relatorio}`);
    }

    console.log('\n  ✅ Migração concluída.\n');
    process.exit(resultado.erros.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n\n  ❌ Erro crítico:', (err as Error).message);
    process.exit(1);
  }
})();
