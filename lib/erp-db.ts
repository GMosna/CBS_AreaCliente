// ============================================================
// SASSI IMÓVEIS — Conexão com ERP (MySQL/MariaDB)
//
// ⚠️  Roda APENAS em API Routes (Node.js runtime).
//     Não importar no middleware (Edge).
//
// Valida se o inquilino existe no ERP da empresa antes
// de emitir tokens de acesso ao portal.
// ============================================================

import mysql from 'mysql2/promise';

// ----------------------------------------------------------
// Pool de conexões — reutiliza conexões entre requests
// (serverless functions criam novas instâncias, mas dentro
//  de uma instância quente o pool evita reconnects)
// ----------------------------------------------------------
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host:             process.env.ERP_MYSQL_HOST!,
      port:             Number(process.env.ERP_MYSQL_PORT ?? 3306),
      database:         process.env.ERP_MYSQL_DATABASE!,
      user:             process.env.ERP_MYSQL_USER!,
      password:         process.env.ERP_MYSQL_PASSWORD!,
      waitForConnections: true,
      connectionLimit:  5,
      connectTimeout:   10_000,
      timezone:         'local',
    });
  }
  return pool;
}

// ----------------------------------------------------------
// Tipo retornado para o login route
// ----------------------------------------------------------
export type ErpInquilino = {
  nome:             string;
  email:            string | null;
  imovel_endereco:  string | null;
};

// ----------------------------------------------------------
// Consulta o ERP:
//   - CPF normalizado (só dígitos) vs inqu.cic
//   - Data de nascimento vs inqu.Data_Nasc
//   - inqu.data_desativado IS NULL  → ainda ativo
//
// Retorna os dados do inquilino ou null se não encontrado.
// Lança 'ERP_UNAVAILABLE' se o banco estiver inacessível.
// ----------------------------------------------------------
export async function contarInquilinosAtivos(): Promise<number> {
  try {
    const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM inqu WHERE data_desativado IS NULL`
    );
    return Number(rows[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function buscarInquilinoERP(
  cpf: string,           // 11 dígitos, sem formatação
  dataNascimento: string // YYYY-MM-DD
): Promise<ErpInquilino | null> {
  try {
    const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
      `SELECT
         inqu.Nome            AS nome,
         inqu.email           AS email,
         inqu.imovel_endereco AS imovel_endereco
       FROM inqu
       WHERE REPLACE(REPLACE(inqu.cic, '.', ''), '-', '') = ?
         AND DATE(inqu.Data_Nasc) = ?
         AND inqu.data_desativado IS NULL
       LIMIT 1`,
      [cpf, dataNascimento]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      nome:            String(row.nome ?? '').trim(),
      email:           row.email ? String(row.email).trim() : null,
      imovel_endereco: row.imovel_endereco ? String(row.imovel_endereco).trim() : null,
    };
  } catch (err) {
    // Nunca expor detalhes de conexão do ERP nos logs de produção
    console.error('[erp-db] Falha ao consultar ERP:', err instanceof Error ? err.message : 'erro desconhecido');
    throw new Error('ERP_UNAVAILABLE');
  }
}
