# Integração Google Sheets → PostgreSQL

Sistema de sincronização dos dados de parceiros da planilha Google Forms
para o banco de dados do portal Sassi Imóveis.

---

## Como funciona

```
Google Forms → Google Sheets → /api/admin/sync → PostgreSQL (Supabase)
                               (a cada 1 hora via Vercel Cron)
```

- Cada linha da planilha é validada (CNPJ matemático, WhatsApp, e-mail)
- CNPJs novos são **inseridos com `aprovado = false`** — nunca auto-aprovados
- CNPJs existentes têm seus dados **atualizados**, mantendo o status `aprovado` atual
- Erros por linha são registrados na tabela `sync_logs` sem parar o sync

---

## Setup — Passo a passo

### 1. Criar projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto (ex: `sassi-portal`)
3. Menu → **APIs & Services** → **Enable APIs**
4. Busque e ative: **Google Sheets API**

---

### 2. Criar Service Account

1. Menu → **IAM & Admin** → **Service Accounts**
2. Clique em **Create Service Account**
   - Nome: `sassi-sheets-sync`
   - ID: `sassi-sheets-sync` (gerado automaticamente)
   - Descrição: `Leitura da planilha de parceiros`
3. Clique em **Done** (não precisa de permissões no projeto)
4. Clique na service account criada → aba **Keys**
5. **Add Key** → **Create new key** → **JSON**
6. O arquivo JSON será baixado automaticamente — **guarde com segurança**

---

### 3. Compartilhar a planilha com a Service Account

1. Abra o arquivo JSON baixado e copie o valor de `client_email`
   - Exemplo: `sassi-sheets-sync@sassi-portal.iam.gserviceaccount.com`
2. Abra a planilha Google Sheets
3. Clique em **Compartilhar** (botão superior direito)
4. Cole o e-mail da service account
5. Permissão: **Leitor** (View only — nunca Editor)
6. Desmarque "Notificar pessoas" e clique em **Compartilhar**

---

### 4. Obter o SHEETS_ID

A URL da planilha tem este formato:
```
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit
```

O `SHEETS_ID` é a string entre `/d/` e `/edit`.

---

### 5. Configurar variáveis de ambiente

Abra o arquivo JSON da service account e cole o conteúdo **minificado** na variável `GOOGLE_SERVICE_ACCOUNT_JSON`.

Para minificar (remover quebras de linha desnecessárias):
```bash
node -e "const fs = require('fs'); console.log(JSON.stringify(JSON.parse(fs.readFileSync('service-account.json'))))"
```

Adicione ao `.env`:
```env
SHEETS_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
ADMIN_SYNC_TOKEN="gere_com_crypto_randomBytes_32"
CRON_SECRET=""
APP_URL="https://seu-dominio.vercel.app"
```

---

### 6. Criar a tabela sync_logs no Supabase

Execute o conteúdo de `prisma/migrations/001_add_sync_logs.sql` no Supabase:

1. Acesse: **Dashboard → SQL Editor**
2. Cole o conteúdo do arquivo SQL
3. Clique em **Run**

---

### 7. Configurar o Cron Job no Vercel

O arquivo `vercel.json` já está configurado para executar o sync **todo início de hora**:

```json
{
  "crons": [{ "path": "/api/admin/sync", "schedule": "0 * * * *" }]
}
```

O Vercel envia automaticamente `Authorization: Bearer <CRON_SECRET>`.
Configure `CRON_SECRET` nas variáveis de ambiente do projeto Vercel.

---

## Disparo manual

```bash
curl -X POST https://seu-dominio.vercel.app/api/admin/sync \
  -H "X-Admin-Token: SEU_ADMIN_SYNC_TOKEN"
```

Ou localmente (com `.env` preenchido):
```bash
APP_URL=http://localhost:3000 npx ts-node scripts/cron-sync.ts
```

---

## Ver histórico de syncs

```bash
curl https://seu-dominio.vercel.app/api/admin/sync \
  -H "X-Admin-Token: SEU_ADMIN_SYNC_TOKEN"
```

---

## Estrutura esperada da planilha

| Coluna | Campo                      | Obrigatório | Validação                    |
|--------|----------------------------|-------------|------------------------------|
| A      | Nome da empresa            | ✅           | Mínimo 2 caracteres          |
| B      | Ramo / Segmento            | ❌           | —                            |
| C      | CNPJ                       | ✅           | Dígitos verificadores válidos |
| D      | Nome do responsável        | ❌           | —                            |
| E      | WhatsApp                   | ❌           | DDD + 8 ou 9 dígitos         |
| F      | E-mail                     | ❌           | Formato válido               |
| G      | Endereço                   | ❌           | —                            |
| H      | Forma do desconto          | ✅           | Mínimo 10 caracteres         |
| I      | Frequência de uso          | ❌           | —                            |
| J      | Timestamp                  | Auto         | Gerado pelo Google Forms     |

> **A linha 1 é sempre o cabeçalho** — o sync começa da linha 2.

---

## Segurança

- A Service Account tem permissão **somente leitura** na planilha
- O CNPJ é validado matematicamente antes de qualquer insert
- Novos parceiros entram com `aprovado = false` — requer aprovação manual no painel
- O JSON da service account **nunca é logado** em nenhuma circunstância
- A rota `/api/admin/sync` exige token secreto — não é acessível publicamente
- Limite de 500 linhas por sync (proteção contra planilhas gigantes)
- Timeout de 30s nas chamadas à API do Google

---

## Variáveis de ambiente necessárias

| Variável                     | Descrição                                         |
|------------------------------|---------------------------------------------------|
| `SHEETS_ID`                  | ID da planilha Google Sheets                      |
| `GOOGLE_SERVICE_ACCOUNT_JSON`| JSON completo da Service Account (minificado)     |
| `ADMIN_SYNC_TOKEN`           | Token secreto para disparar sync manualmente      |
| `CRON_SECRET`                | Secret do Vercel Cron (configurado pelo Vercel)   |
| `APP_URL`                    | URL base da aplicação (para script local)         |
