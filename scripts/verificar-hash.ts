/**
 * Verifica o hash HMAC-SHA256 de um CPF com o mesmo algoritmo usado no portal.
 *
 * Uso:
 *   npx ts-node --skip-project scripts/verificar-hash.ts 12345678900
 *
 * Precisa da variável CPF_SECRET_KEY no ambiente ou no .env.local.
 * Exemplo:
 *   CPF_SECRET_KEY=sua_chave npx ts-node --skip-project scripts/verificar-hash.ts 12345678900
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Carrega .env.local se existir (sem depender de dotenv)
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
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

loadEnvLocal();

const cpfArg = process.argv[2];
if (!cpfArg) {
  console.error('Uso: npx ts-node --skip-project scripts/verificar-hash.ts 12345678900');
  process.exit(1);
}

const secretRaw     = process.env.CPF_SECRET_KEY ?? '';
const secretTrimmed = secretRaw.trim().replace(/[''""]/g, "'");

const cpfLimpo = cpfArg.replace(/\D/g, '').trim();

if (cpfLimpo.length !== 11) {
  console.error('CPF inválido: deve ter 11 dígitos. Recebido:', cpfLimpo.length, 'dígitos.');
  process.exit(1);
}

const hash = crypto
  .createHmac('sha256', secretTrimmed)
  .update(cpfLimpo)
  .digest('hex');

console.log('');
console.log('─────────────────────────────────────────');
console.log('CPF (sanitizado)     :', cpfLimpo);
console.log('Hash completo        :', hash);
console.log('─────────────────────────────────────────');
console.log('Secret length (raw)  :', secretRaw.length);
console.log('Secret length (trim) :', secretTrimmed.length);
console.log('Secret primeiros 4   :', secretTrimmed.substring(0, 4));
console.log('Secret hex[0..4]     :', Buffer.from(secretTrimmed.substring(0, 4)).toString('hex'));
console.log('─────────────────────────────────────────');
console.log('');
console.log('Compare o hash acima com o campo "cpf" no Supabase para o mesmo inquilino.');
console.log('Se forem iguais, o secret está correto.');
console.log('');
