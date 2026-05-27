/**
 * Verifica o hash HMAC-SHA256 de um CPF com o mesmo algoritmo usado no portal.
 *
 * Uso:
 *   npx ts-node --skip-project scripts/verificar-hash.ts
 *
 * O CPF é solicitado via prompt interativo (não fica no histórico do shell).
 * Precisa da variável CPF_SECRET_KEY no ambiente ou no .env.local.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Carrega arquivos .env em ordem de prioridade (local sobrescreve base)
function loadEnvFile(filename: string): void {
  const envPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function mascararCPF(cpf: string): string {
  // Exibe apenas os 2 últimos dígitos (dígitos verificadores)
  return `***.***.***-${cpf.slice(9)}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('CPF (apenas dígitos): ', (input) => {
  rl.close();

  const cpfLimpo = input.replace(/\D/g, '').trim();

  if (cpfLimpo.length !== 11) {
    console.error('CPF inválido: deve ter 11 dígitos. Recebido:', cpfLimpo.length, 'dígitos.');
    process.exit(1);
  }

  const secret = (process.env.CPF_SECRET_KEY ?? '')
    .trim()
    .replace(/[''""]/g, "'");

  const hash = crypto
    .createHmac('sha256', secret)
    .update(cpfLimpo)
    .digest('hex');

  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('CPF                  :', mascararCPF(cpfLimpo));
  console.log('Hash completo        :', hash);
  console.log('─────────────────────────────────────────');
  console.log('');
  console.log('Compare o hash acima com o campo "cpf" no Supabase para o mesmo inquilino.');
  console.log('Se forem iguais, o secret está correto.');
  console.log('');
});
