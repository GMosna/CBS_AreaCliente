# Sassi Imóveis — Guia de Deploy no Vercel

## Pré-requisitos

- Conta no [Vercel](https://vercel.com) (gratuita serve para começar)
- Repositório no GitHub com os dois projetos
- Projeto Supabase criado e tabelas migradas
- Planilha Google Sheets configurada com Service Account

---

## Parte 1 — Deploy do Portal (sassi-area-cliente)

### 1.1 Conectar repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **"Import Git Repository"**
3. Selecione o repositório `sassi-area-cliente`
4. Framework Preset: **Next.js** (detectado automaticamente)
5. Root Directory: `/` (raiz do repositório)
6. Clique em **"Deploy"** — vai falhar por falta de variáveis, mas cria o projeto

### 1.2 Configurar variáveis de ambiente

No Vercel Dashboard → seu projeto → **Settings → Environment Variables**.

Adicione cada variável abaixo para o ambiente **Production** (e opcionalmente Preview):

#### Banco de dados (Supabase)
```
DATABASE_URL
postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL
postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

NEXT_PUBLIC_SUPABASE_URL
https://[REF].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJ...  (chave pública — seguro expor)

SUPABASE_SERVICE_ROLE_KEY
eyJ...  (chave privada — NUNCA expor no frontend)
```

> **Onde encontrar:** Supabase Dashboard → Settings → API

#### Segurança
```
CPF_SECRET_KEY
[gerar: openssl rand -hex 32]

JWT_SECRET
[gerar: openssl rand -base64 64]

JWT_REFRESH_SECRET
[gerar: openssl rand -base64 64]
```

> ⚠️ `CPF_SECRET_KEY` e `JWT_SECRET` devem ser diferentes um do outro.
> ⚠️ Staging e Produção devem ter `CPF_SECRET_KEY` **diferentes** (evita que hashes de staging sirvam em produção).

#### Google Sheets Sync
```
SHEETS_ID
[ID da planilha — está na URL: /spreadsheets/d/<ID>/edit]

GOOGLE_SERVICE_ACCOUNT_JSON
{"type":"service_account","project_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}
```

> O JSON deve estar em **uma única linha** sem quebras de linha (exceto `\n` dentro da chave privada).
> Para minificar: `cat service-account.json | jq -c .`

#### Sync e Cron
```
ADMIN_SYNC_TOKEN
[gerar: openssl rand -hex 32]

CRON_SECRET
[gerar: openssl rand -hex 32]
```

> O `CRON_SECRET` é gerado automaticamente pelo Vercel se você usar o plano Pro.
> No plano gratuito, configure manualmente e use o mesmo valor em `vercel.json`.

#### URLs dos projetos
```
NEXT_PUBLIC_PORTAL_URL
https://sassi-portal.vercel.app
(ou https://portal.sassimoveis.com.br após domínio customizado)

NEXT_PUBLIC_LANDING_URL
https://landing-page-sassi-club.vercel.app
(ou https://sassimoveis.com.br após domínio customizado)
```

#### Ambiente
```
NODE_ENV
production
```

### 1.3 Executar migração do banco

Antes do primeiro deploy funcionar, as tabelas precisam existir no Supabase.

No seu terminal local, com as variáveis de ambiente do Supabase configuradas:

```bash
# Aplica todas as migrations
npx prisma migrate deploy

# Verifica se as tabelas foram criadas
npx prisma db pull
```

### 1.4 Fazer o deploy de produção

Após configurar todas as variáveis:

1. Vá em **Deployments** no dashboard do projeto
2. Clique nos três pontos do último deploy → **"Redeploy"**
3. Aguarde o build completar (~2 min)
4. Acesse a URL gerada: `https://sassi-area-cliente.vercel.app`

### 1.5 Verificar Cron Job

O `vercel.json` já configura o cron:

```json
{
  "crons": [
    {
      "path": "/api/admin/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Verifique em: Vercel Dashboard → seu projeto → **Cron Jobs**.

> **Importante:** Cron Jobs requerem o **plano Pro** do Vercel.
> No plano gratuito, dispare o sync manualmente ou use um serviço externo (cron-job.org).

---

## Parte 2 — Deploy da Landing Page

O processo é idêntico ao Portal. Variáveis adicionais específicas da landing:

```
NEXT_PUBLIC_PORTAL_URL
https://sassi-portal.vercel.app

# Se usar envio de e-mail para confirmação de cadastro:
RESEND_API_KEY
re_...

# Google Forms / Sheets (se o formulário da landing usa a mesma planilha):
SHEETS_ID
[mesmo ID do portal]
```

---

## Parte 3 — Configurar Domínio Customizado

### 3.1 Portal do Inquilino

Objetivo: `portal.sassimoveis.com.br` → `sassi-portal.vercel.app`

1. Vercel Dashboard → Portal project → **Settings → Domains**
2. Clique em **"Add Domain"**
3. Digite: `portal.sassimoveis.com.br`
4. Vercel mostra os registros DNS necessários:

```
Tipo    Nome                    Valor
CNAME   portal                  cname.vercel-dns.com
```

5. Acesse o painel do seu registrador de domínio (GoDaddy, Registro.br, etc.)
6. Adicione o registro CNAME exatamente como indicado
7. Aguarde propagação: de 5 min a 48h (geralmente <1h)
8. Vercel emite o certificado SSL automaticamente

### 3.2 Landing Page

Objetivo: `sassimoveis.com.br` → `landing-page-sassi-club.vercel.app`

Para apex domain (`@` / sem subdomínio):

```
Tipo    Nome    Valor
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 3.3 Atualizar variáveis após domínio customizado

Após os domínios estarem funcionando, atualize nos dois projetos:

```
NEXT_PUBLIC_PORTAL_URL=https://portal.sassimoveis.com.br
NEXT_PUBLIC_LANDING_URL=https://sassimoveis.com.br
```

---

## Parte 4 — Atualização do Footer da Landing Page

Adicione o link para o portal no footer da landing page existente.

### Componente React (Next.js)

Localize o arquivo de footer da landing page (geralmente `components/Footer.tsx` ou `app/footer.tsx`) e adicione:

```tsx
{/* Link para inquilinos — adicionar no final do footer, antes do fechamento */}
<div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
  <p className="text-white/40">
    © {new Date().getFullYear()} Sassi Imóveis. Todos os direitos reservados.
  </p>

  <a
    href={process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://sassi-portal.vercel.app'}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-2 text-white/40 hover:text-[#e43333] transition-colors duration-200"
  >
    <svg
      className="w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
    <span>Sou inquilino Sassi</span>
    <svg
      className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </a>
</div>
```

### HTML puro (caso a landing não seja Next.js)

```html
<div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:2rem; padding-top:1.5rem;
            display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
  <p style="color:rgba(255,255,255,0.4); font-size:14px; margin:0;">
    © 2025 Sassi Imóveis. Todos os direitos reservados.
  </p>
  <a href="https://portal.sassimoveis.com.br"
     target="_blank"
     rel="noopener noreferrer"
     style="color:rgba(255,255,255,0.4); font-size:14px; text-decoration:none;
            display:flex; align-items:center; gap:6px; transition:color 0.2s;"
     onmouseover="this.style.color='#e43333'"
     onmouseout="this.style.color='rgba(255,255,255,0.4)'">
    🏠 Sou inquilino Sassi →
  </a>
</div>
```

---

## Parte 5 — Verificação Pós-Deploy

Execute estes testes após cada deploy em produção:

```bash
# 1. Portal responde
curl -I https://portal.sassimoveis.com.br
# Esperado: HTTP/2 200 ou 307 (redirect para /login)

# 2. Headers de segurança presentes
curl -I https://portal.sassimoveis.com.br | grep -E "x-frame|x-content|strict-transport"

# 3. Rota protegida rejeita sem cookie
curl https://portal.sassimoveis.com.br/portal/dashboard
# Esperado: redirect 307 para /login

# 4. API protegida retorna 401 sem token
curl https://portal.sassimoveis.com.br/api/portal/me
# Esperado: {"error":"Não autenticado"}

# 5. Sync manual funciona
curl -X POST https://portal.sassimoveis.com.br/api/admin/sync \
  -H "X-Admin-Token: SEU_ADMIN_SYNC_TOKEN"
# Esperado: {"success":true,"summary":{...}}

# 6. Rota de admin bloqueada sem token
curl -X POST https://portal.sassimoveis.com.br/api/admin/sync
# Esperado: 401
```

---

## Referência Rápida de Comandos

```bash
# Gerar secrets seguros
openssl rand -base64 64    # JWT_SECRET / JWT_REFRESH_SECRET
openssl rand -hex 32       # CPF_SECRET_KEY / ADMIN_SYNC_TOKEN

# Deploy manual via CLI
npx vercel --prod

# Ver logs de produção
npx vercel logs https://sassi-portal.vercel.app --follow

# Aplicar migrações no banco de produção
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy

# Minificar JSON da Service Account para uma linha
cat google-service-account.json | python3 -m json.tool --no-indent | tr -d '\n'
```

---

## Checklist Final Antes de Ir ao Ar

- [ ] Build sem erros (`npm run build`)
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Todas as variáveis de ambiente configuradas no Vercel
- [ ] Migração do banco executada (`prisma migrate deploy`)
- [ ] Domínios customizados apontando corretamente
- [ ] SECURITY_CHECKLIST.md revisado e aprovado
- [ ] Fluxo de login testado em produção
- [ ] Sync do Sheets testado em produção
- [ ] Footer da landing page atualizado com link para o portal
