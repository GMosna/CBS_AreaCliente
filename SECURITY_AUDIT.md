# Auditoria de Segurança — Sassi Imóveis Área do Inquilino

**Data:** 2026-05-27  
**Auditor:** Engenheiro de Segurança Sênior (Assistido por Claude)  
**Versão do sistema:** Next.js 15.5.18 | Supabase | Vercel Hobby  
**URL de produção:** https://cbs-area-cliente.vercel.app

---

## Resumo Executivo

O portal foi auditado em todas as camadas: autenticação, cookies, middleware, API routes, banco de dados, headers HTTP, dependências e conformidade com LGPD. Foram identificadas **4 vulnerabilidades** (1 alta, 1 média, 2 baixas), todas **corrigidas** nesta auditoria. O sistema tem uma postura de segurança sólida no geral.

---

## Vulnerabilidades Encontradas e Corrigidas

### [ALTA] CVE-múltiplas — Next.js 14.2.35 desatualizado

| Campo | Detalhe |
|-------|---------|
| **Risco** | ALTO |
| **Status** | CORRIGIDO |
| **Arquivo** | `package.json` |

**Problema:** O Next.js 14.2.35 continha múltiplas CVEs incluindo HTTP request smuggling (GHSA-ggv3-7p47-pfv8), XSS em scripts beforeInteractive (GHSA-gx5p-jg67-6x7h), bypass de middleware via i18n (GHSA-36qx-fr4f-26g5), SSRF em WebSocket upgrades, e cache poisoning.

**Correção:** Upgrade para Next.js 15.5.18 com todas as migrations de API necessárias (`headers()` e `params` agora assíncronos).

---

### [MÉDIA] Timing Attack — Comparação de CRON_SECRET sem timingSafeEqual

| Campo | Detalhe |
|-------|---------|
| **Risco** | MÉDIO |
| **Status** | CORRIGIDO |
| **Arquivo** | `app/api/admin/sync/route.ts:21` |

**Problema:** A verificação do `CRON_SECRET` usava comparação direta de strings (`authHeader === \`Bearer ${cronSecret}\``), vulnerável a timing attacks que permitem descobrir o valor do token medindo diferenças de tempo de resposta.

**Correção:** Substituído por `timingSafeEqual` (já importado no arquivo via `crypto`), consistente com o padrão já adotado para o `ADMIN_SYNC_TOKEN`.

---

### [ALTA — SCRIPT] Vazamento de material da chave criptográfica em script de diagnóstico

| Campo | Detalhe |
|-------|---------|
| **Risco** | ALTO (escopo: ferramenta local) |
| **Status** | CORRIGIDO |
| **Arquivo** | `scripts/verificar-hash.ts` |

**Problema:** O script imprimia os primeiros 4 caracteres do `CPF_SECRET_KEY` em plaintext e em hex (`Secret primeiros 4`, `Secret hex[0..4]`). Essa chave protege os hashes de CPF de todos os inquilinos no Supabase. O output podia ser capturado em gravações de sessão, logs de CI/CD ou sessões de screen sharing.

Adicionalmente, o CPF passado como argumento CLI ficava gravado no `~/.zsh_history`.

**Correção:**
- Removidos os logs de material da chave
- CPF agora lido via prompt interativo (`readline`) — não aparece no histórico do shell
- CPF mascarado no output (`***.***.***.XX`)

---

### [BAIXA] Ausência de headers de segurança HTTP no nível do framework

| Campo | Detalhe |
|-------|---------|
| **Risco** | BAIXO-MÉDIO |
| **Status** | CORRIGIDO |
| **Arquivo** | `next.config.ts` (criado) |

**Problema:** Não existia `next.config.ts`. O middleware aplicava 3 headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) apenas em respostas dinâmicas, mas não em assets estáticos, páginas de erro do Next.js, ou rotas não cobertas pelo matcher. Faltavam completamente: CSP, HSTS, `X-XSS-Protection`, `Permissions-Policy`.

**Correção:** Criado `next.config.ts` com headers completos aplicados a **todas as rotas** (`source: '/(.*)'`):

| Header | Valor |
|--------|-------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| X-XSS-Protection | `1; mode=block` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |

---

## Itens Auditados e Aprovados (sem vulnerabilidades)

### Autenticação e Sessão

| Verificação | Status |
|-------------|--------|
| Access token expira em 15 minutos (JWT `exp`) | ✅ |
| Refresh token expira em 7 dias | ✅ |
| Refresh token é opaco (aleatório, não JWT) — mais seguro | ✅ |
| JWT assinado com HS256 | ✅ |
| Payload do JWT contém apenas `{ id, role }` — sem CPF ou dados sensíveis | ✅ |
| `access_token` cookie: `HttpOnly`, `SameSite=Strict`, `Secure` em produção, `path=/` | ✅ |
| `refresh_token` cookie: `HttpOnly`, `SameSite=Strict`, `Secure`, `path=/api/auth/refresh` | ✅ |
| Refresh token armazenado como SHA-256 no banco (nunca plaintext) | ✅ |
| Rotação obrigatória do refresh token a cada uso | ✅ |
| Revogação do refresh token no logout | ✅ |
| Refresh silencioso funciona corretamente quando access token expira | ✅ |
| Logout limpa todos os cookies via `clearAuthCookies` | ✅ |

### Proteção Contra Ataques

| Verificação | Status |
|-------------|--------|
| Rate limiting por IP: 5 tentativas em 10 min, bloqueio de 30 min | ✅ |
| Rate limit implementado via função PostgreSQL atômica (sem race conditions) | ✅ |
| Rate limit registrado em `login_attempts` | ✅ |
| Todas as queries usam Supabase client (prepared statements internamente) | ✅ |
| Zero concatenação de strings em queries | ✅ |
| Validação Zod antes de qualquer chamada ao banco (login, sheets-sync) | ✅ |
| Nenhum uso de `dangerouslySetInnerHTML` | ✅ |
| Cookies `SameSite=Strict` previnem CSRF | ✅ |
| Mensagem de erro genérica no login (`CPF ou data de nascimento inválidos`) | ✅ |
| CPF nunca retornado em respostas de API | ✅ |
| Stack traces nunca expostos ao cliente | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` sem prefixo `NEXT_PUBLIC_` | ✅ |

### Middleware de Autenticação

| Verificação | Status |
|-------------|--------|
| Todas as rotas `/portal/*` protegidas | ✅ |
| Todas as rotas `/api/portal/*` protegidas | ✅ |
| Bug do `startsWith('/')` corrigido (memória de sessão anterior) | ✅ |
| Token inválido → limpa cookies + redireciona para `/login` | ✅ |
| Token expirado → refresh automático antes de rejeitar | ✅ |
| Headers de segurança em todas as respostas dinâmicas | ✅ |

### API Routes

| Verificação | Status |
|-------------|--------|
| `/api/portal/me` — retorna apenas `id` e `nome` (sem CPF) | ✅ |
| `/api/portal/parceiros` — apenas parceiros `ativo=true` e `aprovado=true` | ✅ |
| `/api/portal/parceiros/[id]` — filtros `ativo` e `aprovado` | ✅ |
| `/api/portal/notificacoes` — filtro por `inquilino_id` (sem cross-user leak) | ✅ |
| `/api/portal/notificacoes/[id]/read` — `WHERE inquilino_id = $1` previne IDOR | ✅ |
| `/api/admin/sync` — protegido por `ADMIN_SYNC_TOKEN` + `CRON_SECRET` | ✅ |
| `/api/admin/parceiros/aprovar` — protegido por HMAC-SHA256 (token de aprovação) | ✅ |
| `timingSafeEqual` usado em todas as comparações de tokens | ✅ |

### Banco de Dados

| Verificação | Status |
|-------------|--------|
| CPF armazenado como HMAC-SHA256 (não reversível sem a chave) | ✅ |
| Refresh tokens armazenados como SHA-256 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` usado server-side — bypassa RLS (correto) | ✅ |
| Selects retornam apenas campos necessários (princípio do mínimo privilégio) | ✅ |

### LGPD

| Verificação | Status |
|-------------|--------|
| CPF nunca exposto em respostas de API | ✅ |
| Audit log registra `login_success`, `login_fail`, `logout`, `token_refresh`, `visualizou_parceiro` | ✅ |
| CPF armazenado apenas como hash irreversível | ✅ |
| Dados coletados são mínimos: nome, e-mail, imóvel de referência, data de nascimento | ✅ |

---

## Vulnerabilidade Aceita (Não Acionável)

### [MODERADA] PostCSS < 8.5.10 (GHSA-qx2v-qp2m-jg93)

| Campo | Detalhe |
|-------|---------|
| **Risco** | MODERADO |
| **Status** | ACEITO |

**Motivo:** Esta versão do PostCSS é uma dependência **interna** do Next.js 15.5.18 usada apenas em build-time para processar CSS. A vulnerabilidade afeta o stringify de CSS gerado pelo servidor — não processa input de usuário. O "fix" sugerido pelo `npm audit` (instalar Next.js 9.3.3) é incorreto e introduziria regressões severas. A vulnerabilidade não é acionável neste contexto.

**Revisão recomendada:** Quando o Next.js lançar uma versão que atualize seu PostCSS interno para ≥ 8.5.10.

---

## Recomendações Adicionais

1. **Implementar CAPTCHA** após 3 tentativas de login com falha (atualmente só rate limit por IP). Considerar hCaptcha ou Cloudflare Turnstile — ambos sem custo e compatíveis com LGPD.

2. **Configurar RLS explícito no Supabase** para as tabelas `inquilinos`, `refresh_tokens` e `audit_logs`. Embora o portal use `service_role` server-side (que bypassa RLS), políticas explícitas protegem contra acesso via chave `anon` caso ela vaze.

3. **Rotação periódica do `CPF_SECRET_KEY`** requer rehashing de todos os CPFs — documentar o procedimento antes de precisar.

4. **Monitoramento de anomalias:** Configurar alerta no Supabase quando `login_fail` exceder 50/hora de um mesmo IP (possível credential stuffing de grande escala).

5. **Submeter ao HSTS Preload List** após 6 meses de HSTS ativo: https://hstspreload.org — aumenta proteção contra SSL stripping.

---

## Resultado Final

```
Vulnerabilidades críticas:     0 (abertas)
Vulnerabilidades altas:        0 (abertas) — 2 corrigidas
Vulnerabilidades médias:       0 (abertas) — 1 corrigida
Vulnerabilidades baixas:       0 (abertas) — 1 corrigida
Vulnerabilidades aceitas:      1 (PostCSS interno, não acionável)

Build: PASSING ✅
Deploy: PRONTO PARA PRODUÇÃO ✅
```
