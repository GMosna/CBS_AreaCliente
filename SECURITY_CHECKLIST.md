# Sassi Imóveis — Checklist de Segurança Pré-Deploy

Execute este checklist antes de cada deploy em produção.
Marque cada item manualmente após verificar.

---

## 1. Secrets e Variáveis de Ambiente

- [ ] **JWT_SECRET tem pelo menos 64 caracteres aleatórios**
  ```bash
  openssl rand -base64 64
  # ou
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Verificar: `echo -n "$JWT_SECRET" | wc -c` → deve retornar ≥ 64

- [ ] **JWT_REFRESH_SECRET é diferente do JWT_SECRET**
  Nunca reutilizar o mesmo secret para access e refresh tokens.

- [ ] **CPF_SECRET_KEY é único e não compartilhado entre ambientes**
  Cada ambiente (staging, produção) deve ter seu próprio CPF_SECRET_KEY.
  **Atenção:** trocar esta chave invalida todos os logins existentes (os hashes mudam).

- [ ] **ADMIN_SYNC_TOKEN tem pelo menos 32 caracteres aleatórios**
  ```bash
  openssl rand -hex 32
  ```

- [ ] **SUPABASE_SERVICE_ROLE_KEY não está exposta no frontend**
  Esta chave NUNCA deve aparecer em variáveis `NEXT_PUBLIC_*`.

- [ ] **Nenhum secret está commitado no git**
  ```bash
  git log --all --full-history -- ".env*"
  git grep -r "eyJ"         # procura tokens JWT
  git grep -r "sk_live"     # procura chaves privadas
  ```

- [ ] **.env está no .gitignore**
  ```bash
  grep "^\.env" .gitignore
  ```

---

## 2. Cookies e Sessão

- [ ] **Cookies com `Secure=true` em produção**
  Em `lib/auth.ts`, verificar que `secure: process.env.NODE_ENV === 'production'`.

- [ ] **Cookies com `httpOnly: true`**
  Impede acesso via `document.cookie` (XSS).

- [ ] **Cookies com `sameSite: 'strict'`**
  Bloqueia envio cross-site (CSRF).

- [ ] **Access token expira em 15 minutos**
  Verificar em `lib/auth.ts`: `expiresIn: '15m'`.

- [ ] **Refresh token expira em 7 dias**
  Verificar em `lib/auth.ts`: cookie `maxAge: 7 * 24 * 60 * 60`.

- [ ] **Logout limpa os dois cookies e invalida o refresh token no banco**
  Verificar rota `/api/auth/logout`.

---

## 3. Banco de Dados (Supabase)

- [ ] **RLS (Row Level Security) habilitado em todas as tabelas**
  No Supabase Dashboard → Table Editor → cada tabela → "RLS enabled":
  - [ ] `inquilinos`
  - [ ] `refresh_tokens`
  - [ ] `notificacoes`
  - [ ] `audit_logs`
  - [ ] `login_attempts`
  - [ ] `parceiros`
  - [ ] `sync_logs`

- [ ] **Políticas RLS corretas para `notificacoes`**
  Inquilino só lê notificações onde `inquilino_id = auth.uid()`.

- [ ] **CPF nunca armazenado em plain text**
  Verificar `lib/auth.ts`: CPF sempre tratado via `hashCPF()` (HMAC-SHA256) antes de qualquer query.

- [ ] **Refresh tokens armazenados como SHA-256 hash**
  Verificar `lib/auth.ts`: `crypto.createHash('sha256').update(token).digest('hex')`.

- [ ] **Backup automático configurado no Supabase**
  Dashboard → Project Settings → Database → Point in Time Recovery (PITR).
  Plano Pro inclui backups diários automáticos.

- [ ] **`DATABASE_URL` usa connection pooler (porta 6543)**
  Para o Prisma Client em runtime (Vercel serverless tem conexões efêmeras).

- [ ] **`DIRECT_URL` usa conexão direta (porta 5432)**
  Para migrações (`prisma migrate deploy`).

---

## 4. Rate Limiting e Proteção contra Força Bruta

- [ ] **Rate limit testado: 5 tentativas → bloqueio de 15 min**
  ```bash
  # Teste manual: tentar login com CPF correto mas data errada 5x
  # Na 6ª tentativa deve retornar 429 com blockedUntil
  ```

- [ ] **`timingSafeEqual` usado em todas as comparações de tokens**
  Verificar em `lib/auth.ts` e `lib/verify-jwt.ts`.

- [ ] **IP do cliente extraído corretamente em produção**
  Verificar `lib/audit.ts`: usa `x-forwarded-for` (Vercel injeta automaticamente).

---

## 5. Headers de Segurança

- [ ] **X-Frame-Options: DENY** — impede clickjacking

- [ ] **X-Content-Type-Options: nosniff** — impede MIME sniffing

- [ ] **Referrer-Policy: strict-origin-when-cross-origin**

- [ ] **Content-Security-Policy configurado**
  Verificar `next.config.mjs`. Testar com [CSP Evaluator](https://csp-evaluator.withgoogle.com/).

- [ ] **HSTS habilitado em produção**
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`

- [ ] **`robots: { index: false, follow: false }` no layout.tsx**
  Portal privado não deve ser indexado por mecanismos de busca.

---

## 6. Logs e Observabilidade

- [ ] **Logs não contêm CPF em plain text**
  Buscar no código:
  ```bash
  grep -r "cpf" app/ lib/ --include="*.ts" | grep "console\."
  ```

- [ ] **Logs não contêm senhas, tokens ou chaves**
  ```bash
  grep -r "JWT_SECRET\|SERVICE_ROLE\|CPF_SECRET" app/ lib/ --include="*.ts" | grep "console\."
  ```

- [ ] **`error.digest` usado no lugar do stack trace em error.tsx**
  Verificar `app/error.tsx`: apenas `error.digest` é logado, nunca `error.stack`.

- [ ] **Erros do Supabase não retornam detalhes ao cliente**
  Verificar API routes: todas retornam `{ error: 'Erro interno' }`, não `error.message` do Supabase.

---

## 7. Validação de Dados

- [ ] **CNPJ validado matematicamente antes de INSERT**
  Verificar `lib/sheets-sync.ts`: função `validarCNPJ()`.

- [ ] **Body das API routes validado com Zod**
  Verificar `/api/auth/login/route.ts`.

- [ ] **Todos os inputs sanitizados (trim) antes do banco**
  Verificar `lib/sheets-sync.ts`: `.trim()` em todos os campos de string.

- [ ] **Sync limitado a 500 linhas por execução**
  Proteção contra planilhas gigantescas. Verificar `lib/sheets-sync.ts`.

---

## 8. HTTPS e Domínio

- [ ] **Domínio com HTTPS obrigatório**
  No Vercel, HTTPS é automático. Se usar domínio customizado, verificar certificado SSL ativo.

- [ ] **Redirect HTTP → HTTPS configurado**
  Vercel faz isso automaticamente para todos os domínios.

- [ ] **`NEXT_PUBLIC_PORTAL_URL` aponta para HTTPS**
  Ex: `https://portal.sassimoveis.com.br` (não `http://`).

---

## 9. Google Sheets Sync

- [ ] **Service Account tem permissão apenas de LEITURA na planilha**
  Google Sheets → Compartilhar → verificar que a service account tem papel "Leitor".

- [ ] **Sync testado com dados reais antes de ir para produção**
  Executar `POST /api/admin/sync` com dados de teste e verificar `sync_logs`.

- [ ] **Timeout de 30s configurado na chamada à API do Google**
  Verificar `lib/sheets-sync.ts`.

- [ ] **ADMIN_SYNC_TOKEN testado antes do deploy**
  ```bash
  curl -X POST https://seu-portal.vercel.app/api/admin/sync \
    -H "X-Admin-Token: $ADMIN_SYNC_TOKEN"
  ```

---

## 10. Testes Finais (Staging → Produção)

- [ ] **Fluxo completo testado em staging antes de produção**
  1. Login com CPF + data de nascimento corretos → redireciona para dashboard
  2. Login com dados errados 5x → bloqueio de 15 min
  3. Acessa `/portal/dashboard` sem cookie → redireciona para `/login`
  4. Token expira em 15 min → refresh silencioso acontece
  5. Logout → cookies removidos, refresh_token invalidado no DB
  6. Parceiros aparecem na lista (ativo=true, aprovado=true)
  7. DiscountModal abre, copy funciona, WhatsApp abre em nova aba
  8. Notificações listadas, marcar como lida funciona
  9. Sync manual via API funciona e registra em sync_logs

- [ ] **Build de produção sem erros**
  ```bash
  npm run build
  ```

- [ ] **TypeScript sem erros**
  ```bash
  npx tsc --noEmit
  ```

---

## Assinatura

Checklist revisado por: ________________________

Data: ____/____/________

Deploy autorizado: [ ] Sim  [ ] Não
