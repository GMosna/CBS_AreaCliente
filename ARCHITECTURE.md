# Sassi Imóveis — Arquitetura do Sistema

## Visão Geral

O sistema é composto por dois projetos Next.js independentes que compartilham o mesmo banco de dados (Supabase/PostgreSQL) e fonte de dados (Google Sheets).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                    │
│                                                                     │
│   Empresa                          Inquilino                        │
│   (parceiro)                       (locatário)                      │
│      │                                  │                           │
│      ▼                                  ▼                           │
│ ┌────────────────┐              ┌────────────────┐                  │
│ │  LANDING PAGE  │              │    PORTAL      │                  │
│ │  (Next.js 14)  │              │  (Next.js 14)  │                  │
│ │                │              │                │                  │
│ │ Cadastro de    │              │ Área do        │                  │
│ │ parceiros via  │              │ Inquilino:     │                  │
│ │ formulário     │              │ - Dashboard    │                  │
│ │                │              │ - Parceiros    │                  │
│ │ Vercel         │              │ - Notificações │                  │
│ └───────┬────────┘              └───────┬────────┘                  │
│         │                              │                            │
│         │ Google Forms/Sheet           │ JWT Cookies                │
│         ▼                              ▼                            │
│ ┌───────────────┐              ┌───────────────────┐                │
│ │ GOOGLE SHEETS │              │  SUPABASE (PG)    │                │
│ │               │◄─────────────│  - inquilinos     │                │
│ │ Respostas do  │  Sync horário│  - parceiros      │                │
│ │ formulário de │  (Vercel     │  - refresh_tokens │                │
│ │ cadastro      │   Cron)      │  - notificacoes   │                │
│ └───────────────┘              │  - audit_logs     │                │
│                                │  - login_attempts │                │
│                                │  - sync_logs      │                │
│                                └───────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo 1 — Cadastro de Parceiro

```
Empresa                  Landing Page              Google Sheets         Portal DB
   │                          │                         │                    │
   │  Acessa formulário       │                         │                    │
   ├─────────────────────────►│                         │                    │
   │                          │                         │                    │
   │  Preenche dados e envia  │                         │                    │
   ├─────────────────────────►│                         │                    │
   │                          │  Insere nova linha      │                    │
   │                          ├────────────────────────►│                    │
   │                          │                         │                    │
   │  Confirmação na tela     │                         │                    │
   │◄─────────────────────────┤                         │  (aguarda sync)    │
   │                          │                         │                    │
   │                     [A cada hora — Vercel Cron]    │                    │
   │                          │                         │                    │
   │                    POST /api/admin/sync             │                    │
   │                          ├────────────────────────►│                    │
   │                          │  Lê até 500 linhas      │                    │
   │                          │◄────────────────────────┤                    │
   │                          │                         │                    │
   │                          │  Valida CNPJ, sanitiza  │                    │
   │                          │  INSERT se novo         │                    │
   │                          │  (aprovado = false)     │                    │
   │                          ├─────────────────────────────────────────────►│
   │                          │                         │                    │
   │                          │                         │  Admin aprova       │
   │                          │                         │  manualmente no    │
   │                          │                         │  Supabase          │
   │                          │                         │  (aprovado = true) │
   │                          │                         │                    │
```

**Regra crítica:** Novos parceiros entram com `aprovado = false`. Nenhum parceiro aparece no portal sem aprovação manual.

---

## Fluxo 2 — Autenticação do Inquilino

```
Inquilino               Portal (Edge)              Portal (API)           Supabase
   │                        │                           │                     │
   │  GET /login            │                           │                     │
   ├───────────────────────►│                           │                     │
   │                        │  Não tem cookie válido    │                     │
   │◄───────────────────────┤  → serve página de login  │                     │
   │                        │                           │                     │
   │  POST /api/auth/login  │                           │                     │
   │  { cpf, dataNasc }     │                           │                     │
   ├───────────────────────────────────────────────────►│                     │
   │                        │                           │  SELECT inquilino   │
   │                        │                           │  WHERE cpf_hash=?   │
   │                        │                           ├────────────────────►│
   │                        │                           │◄────────────────────┤
   │                        │                           │                     │
   │                        │                           │  Valida birth date  │
   │                        │                           │  Gera access_token  │
   │                        │                           │  (JWT, 15min)       │
   │                        │                           │  Gera refresh_token │
   │                        │                           │  (opaco, 7 dias)    │
   │                        │                           │  Salva hash no DB   │
   │                        │                           ├────────────────────►│
   │                        │                           │                     │
   │  Set-Cookie:           │                           │                     │
   │  access_token (15min)  │                           │                     │
   │  refresh_token (7d)    │                           │                     │
   │◄───────────────────────────────────────────────────┤                     │
   │                        │                           │                     │
   │  GET /portal/dashboard │                           │                     │
   ├───────────────────────►│                           │                     │
   │                        │  Verifica JWT no cookie   │                     │
   │                        │  Injeta x-inquilino-id    │                     │
   │                        │  header → passa request   │                     │
   │◄───────────────────────┤                           │                     │
```

**Renovação silenciosa:** Se o `access_token` expirou mas o `refresh_token` é válido, o middleware faz a renovação automaticamente antes de servir a página — o inquilino nunca vê a tela de login novamente dentro dos 7 dias.

---

## Fluxo 3 — Inquilino usa um benefício

```
Inquilino            Portal (Browser)          Portal (API)           Supabase
   │                       │                        │                     │
   │  Clica em parceiro    │                        │                     │
   ├──────────────────────►│                        │                     │
   │                       │  Abre DiscountModal    │                     │
   │◄──────────────────────┤                        │                     │
   │                       │                        │                     │
   │                       │  POST /api/portal/     │                     │
   │                       │  parceiros/{id}        │                     │
   │                       │  (fire & forget)       │                     │
   │                       ├───────────────────────►│                     │
   │                       │                        │  INSERT audit_log   │
   │                       │                        │  acao=visualizou_   │
   │                       │                        │  parceiro           │
   │                       │                        ├────────────────────►│
   │                       │                        │                     │
   │  Clica "Copiar"       │                        │                     │
   ├──────────────────────►│                        │                     │
   │                       │  navigator.clipboard   │                     │
   │  "Copiado!" (2.5s)    │                        │                     │
   │◄──────────────────────┤                        │                     │
   │                       │                        │                     │
   │  Abre WhatsApp        │  window.open(wa.me)    │                     │
   ├──────────────────────►├───────────────────────►│                     │
```

---

## Camadas de Segurança

```
REQUEST
   │
   ▼
┌─────────────────────────────────────────┐
│  Edge Middleware (middleware.ts)         │
│  • Verifica JWT (jose, Edge-compatible) │
│  • Rate limit por IP (login_attempts)  │
│  • Renova token silenciosamente         │
│  • Injeta x-inquilino-id header         │
│  • Adiciona security headers            │
│    (X-Frame-Options, CSP, HSTS, etc.)   │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  API Routes / Server Components         │
│  • Lê x-inquilino-id (já verificado)   │
│  • Supabase com service_role_key        │
│  • Zod validation no body da request   │
│  • Audit log em ações sensíveis         │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  Supabase / PostgreSQL                  │
│  • RLS habilitado em todas as tabelas  │
│  • CPF armazenado como HMAC-SHA256     │
│  • Refresh tokens como SHA-256 hash    │
│  • Políticas: inquilino só lê os       │
│    próprios dados                       │
└─────────────────────────────────────────┘
```

---

## Pontos de Falha e Mitigações

| Ponto de falha | Impacto | Mitigação |
|---|---|---|
| Google Sheets fora do ar | Sync não executa | `sync_logs` registra falha; próximo cron tenta novamente. Dados existentes no DB não são afetados. |
| JWT_SECRET vazado | Tokens forjáveis | Rotacionar o secret + invalidar todos os refresh_tokens (DELETE FROM refresh_tokens). |
| Supabase fora do ar | Portal indisponível | Next.js retorna 500; error boundary mostra página amigável. SLA do Supabase: 99.9%. |
| Parceiro cadastrado com CNPJ inválido | Dado lixo no DB | Validação matemática dos dígitos verificadores antes de qualquer INSERT. |
| Ataque de força bruta no login | Conta comprometida | Rate limit: 5 tentativas → bloqueio de 15 min por IP. `timingSafeEqual` evita timing attacks. |
| Inquilino acessa dado de outro | Vazamento de dados | Middleware injeta o `inquilino_id` verificado; todas as queries filtram por ele. RLS como segunda camada. |
| Refresh token roubado (XSS) | Sessão sequestrada | Cookie `httpOnly` impede acesso via JS. `sameSite=strict` bloqueia CSRF. |
| Sync duplica parceiros | Dados duplicados | Lógica manual: SELECT → se existe, UPDATE; se não, INSERT. Nunca UPSERT (preserva `aprovado`). |

---

## Estrutura de Pastas (Portal)

```
sassi-area-cliente/
├── app/
│   ├── (auth)/login/          # Tela de login
│   ├── (portal)/portal/       # Páginas protegidas
│   │   ├── dashboard/         # Página inicial
│   │   ├── parceiros/         # Lista + detalhe
│   │   └── notificacoes/      # Central de mensagens
│   ├── api/
│   │   ├── auth/              # login / logout / refresh
│   │   ├── portal/            # me / parceiros / notificacoes
│   │   └── admin/sync         # Trigger do sync manual
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── portal/                # Header, PartnerCard, DiscountModal
│   └── ui/                    # Button, Input, Card, Badge, Modal
├── hooks/                     # useAuth, useNotificacoes, useRateLimit
├── lib/                       # auth, audit, rate-limit, sheets-sync, verify-jwt
├── middleware.ts              # Proteção de rotas (Edge Runtime)
├── prisma/schema.prisma       # Modelos do banco
├── types/                     # auth, parceiro, notificacao, sheets
├── design-tokens.ts           # Tokens compartilhados
├── ARCHITECTURE.md            # Este arquivo
├── SECURITY_CHECKLIST.md
├── DEPLOY_GUIDE.md
└── vercel.json                # Cron config
```
