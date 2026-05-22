// ============================================================
// SASSI IMÓVEIS — Script de Sync Manual / GitHub Actions
//
// Uso local:
//   npx ts-node scripts/cron-sync.ts
//
// GitHub Actions (adicionar no workflow):
//   - name: Sync Sheets
//     run: npx ts-node scripts/cron-sync.ts
//     env:
//       APP_URL: ${{ secrets.APP_URL }}
//       ADMIN_SYNC_TOKEN: ${{ secrets.ADMIN_SYNC_TOKEN }}
// ============================================================

import 'dotenv/config';

async function runSync() {
  const appUrl = process.env.APP_URL;
  const adminToken = process.env.ADMIN_SYNC_TOKEN;

  if (!appUrl || !adminToken) {
    console.error('❌ APP_URL e ADMIN_SYNC_TOKEN são obrigatórios');
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] Iniciando sync...`);

  try {
    const response = await fetch(`${appUrl}/api/admin/sync`, {
      method: 'POST',
      headers: {
        'X-Admin-Token': adminToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Sync falhou:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const { sync } = data;
    console.log('✅ Sync concluído:');
    console.log(`   Total linhas: ${sync.totalLinhas}`);
    console.log(`   Inseridos:    ${sync.inseridos}`);
    console.log(`   Atualizados:  ${sync.atualizados}`);
    console.log(`   Erros:        ${sync.erros}`);
    console.log(`   Status:       ${sync.status}`);

    if (sync.status === 'error') process.exit(1);
  } catch (err) {
    console.error('❌ Erro de rede:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

runSync();
