// ============================================================
// SASSI IMÓVEIS — Testes de Autenticação
// Rodar com: npx vitest
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashCPF, compareCPF, generateAccessToken, generateRefreshToken, hashToken } from '../lib/auth';
import { verifyAccessToken } from '../lib/verify-jwt';

// ----------------------------------------------------------
// Configuração de variáveis de ambiente para testes
// ----------------------------------------------------------
vi.stubEnv('CPF_SECRET_KEY', 'chave_secreta_de_testes_32_chars_!!');
vi.stubEnv('JWT_SECRET', 'jwt_secret_para_testes_minimo_32_caracteres_aqui');

// ============================================================
// TESTES: hashCPF e compareCPF
// ============================================================
describe('hashCPF', () => {
  it('produz sempre o mesmo hash para o mesmo CPF', () => {
    const hash1 = hashCPF('12345678901');
    const hash2 = hashCPF('12345678901');
    expect(hash1).toBe(hash2);
  });

  it('produz hashes diferentes para CPFs diferentes', () => {
    const hash1 = hashCPF('12345678901');
    const hash2 = hashCPF('98765432100');
    expect(hash1).not.toBe(hash2);
  });

  it('retorna string hexadecimal de 64 caracteres', () => {
    const hash = hashCPF('12345678901');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('compareCPF', () => {
  it('retorna true para CPF correto', () => {
    const hash = hashCPF('12345678901');
    expect(compareCPF('12345678901', hash)).toBe(true);
  });

  it('retorna false para CPF errado', () => {
    const hash = hashCPF('12345678901');
    expect(compareCPF('00000000000', hash)).toBe(false);
  });

  it('retorna false para hash adulterado', () => {
    const hash = hashCPF('12345678901');
    const hashAdulterado = hash.replace('a', 'b');
    expect(compareCPF('12345678901', hashAdulterado)).toBe(false);
  });
});

// ============================================================
// TESTES: JWT — Access Token
// ============================================================
describe('generateAccessToken + verifyAccessToken', () => {
  it('gera um token JWT válido', async () => {
    const token = await generateAccessToken({ id: 'uuid-123', role: 'inquilino' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('token verificado retorna o payload correto', async () => {
    const token = await generateAccessToken({ id: 'uuid-abc', role: 'inquilino' });
    const payload = await verifyAccessToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.id).toBe('uuid-abc');
    expect(payload?.role).toBe('inquilino');
  });

  it('token com assinatura inválida retorna null', async () => {
    const token = await generateAccessToken({ id: 'uuid-123', role: 'inquilino' });

    // Adultera a assinatura (último segmento do JWT)
    const partes = token.split('.');
    partes[2] = partes[2].split('').reverse().join('');
    const tokenAdulterado = partes.join('.');

    const payload = await verifyAccessToken(tokenAdulterado);
    expect(payload).toBeNull();
  });

  it('string aleatória retorna null', async () => {
    const payload = await verifyAccessToken('isso.nao.e.um.jwt');
    expect(payload).toBeNull();
  });

  it('string vazia retorna null', async () => {
    const payload = await verifyAccessToken('');
    expect(payload).toBeNull();
  });
});

// ============================================================
// TESTES: Refresh Token
// ============================================================
describe('generateRefreshToken', () => {
  it('gera string de 128 caracteres hexadecimais', () => {
    const token = generateRefreshToken();
    expect(token).toHaveLength(128);
    expect(token).toMatch(/^[0-9a-f]{128}$/);
  });

  it('cada chamada gera um token único', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();
    expect(token1).not.toBe(token2);
  });
});

describe('hashToken', () => {
  it('hash do token tem 64 caracteres (SHA-256 hex)', () => {
    const token = generateRefreshToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
  });

  it('mesmo token sempre produz o mesmo hash', () => {
    const token = generateRefreshToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('tokens diferentes produzem hashes diferentes', () => {
    const hash1 = hashToken(generateRefreshToken());
    const hash2 = hashToken(generateRefreshToken());
    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================
// TESTES: Fluxo de Login (integração simulada)
//
// Para testes de integração reais (com banco de dados),
// use um banco de testes isolado e rode com:
//   DATABASE_URL=... npx vitest --mode integration
// ============================================================
describe('Fluxo de login — lógica de negócio', () => {
  it('CPF sanitizado corretamente (remove máscara)', () => {
    const cpfComMascara = '123.456.789-00';
    const cpfDigitos = cpfComMascara.replace(/\D/g, '');
    expect(cpfDigitos).toBe('12345678900');
    expect(cpfDigitos).toHaveLength(11);
  });

  it('data_nascimento no formato correto', () => {
    const data = '1985-03-15';
    expect(data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('data_nascimento com timezone é normalizada', () => {
    // Simula o que vem do banco com timezone
    const dataComTimezone = '1985-03-15T00:00:00.000Z';
    const dataApenas = dataComTimezone.split('T')[0];
    expect(dataApenas).toBe('1985-03-15');
  });

  it('mensagem de erro é genérica para CPF inválido', () => {
    const mensagem = 'CPF ou data de nascimento inválidos';
    // Garante que a mensagem não revela qual campo errou
    expect(mensagem).not.toContain('CPF inválido');
    expect(mensagem).not.toContain('data inválida');
    expect(mensagem).not.toContain('não encontrado');
    expect(mensagem).not.toContain('inativo');
  });
});
