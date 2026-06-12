#!/usr/bin/env bash
# Teste de fluxo completo em produção
# Uso: bash scripts/test-producao.sh <CPF> <SENHA>
# Ex:  bash scripts/test-producao.sh "123.456.789-00" "minhasenha"

set -e
BASE="https://cbs-area-cliente.vercel.app"
CPF="${1:?Informe o CPF}"
DATA_NASC="${2:?Informe a data de nascimento (DD/MM/AAAA ou AAAA-MM-DD)}"

# Normalizar para YYYY-MM-DD
if echo "$DATA_NASC" | grep -qE "^\d{2}/\d{2}/\d{4}$"; then
  DIA=$(echo "$DATA_NASC" | cut -d/ -f1)
  MES=$(echo "$DATA_NASC" | cut -d/ -f2)
  ANO=$(echo "$DATA_NASC" | cut -d/ -f3)
  DATA_ISO="$ANO-$MES-$DIA"
else
  DATA_ISO="$DATA_NASC"
fi
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

ok()   { echo "  ✔ $1"; }
fail() { echo "  ✘ $1"; FALHAS=$((FALHAS+1)); }
FALHAS=0

sep() { echo ""; echo "──────────────────────────────────"; echo "$1"; echo "──────────────────────────────────"; }

# ── 1. Login ────────────────────────────────────────────────
sep "1. LOGIN"
LOGIN_RESP=$(/usr/bin/curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"cpf\":\"$CPF\",\"dataNascimento\":\"$DATA_ISO\"}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$LOGIN_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
BODY=$(echo "$LOGIN_RESP" | grep -v "__STATUS__")

if [ "$STATUS" = "200" ]; then
  ok "Login → HTTP $STATUS"
  echo "  Body: $BODY"
else
  fail "Login → HTTP $STATUS — $BODY"
fi

# ── 2. Dashboard ─────────────────────────────────────────────
sep "2. DASHBOARD (página)"
CODE=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" -L \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/portal/dashboard")
[ "$CODE" = "200" ] && ok "Dashboard → HTTP $CODE" || fail "Dashboard → HTTP $CODE"

# ── 3. API /me ────────────────────────────────────────────────
sep "3. API /me (inquilino autenticado)"
ME_RESP=$(/usr/bin/curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "$BASE/api/portal/me" -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$ME_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
BODY=$(echo "$ME_RESP" | grep -v "__STATUS__")
if [ "$STATUS" = "200" ]; then
  ok "/me → HTTP $STATUS"
  echo "  $BODY"
else
  fail "/me → HTTP $STATUS — $BODY"
fi

# ── 4. Listar parceiros ───────────────────────────────────────
sep "4. API /parceiros"
PARC_RESP=$(/usr/bin/curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "$BASE/api/portal/parceiros" -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$PARC_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
BODY=$(echo "$PARC_RESP" | grep -v "__STATUS__")
if [ "$STATUS" = "200" ]; then
  COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('parceiros',d) if isinstance(d,dict) else d))" 2>/dev/null || echo "?")
  ok "/parceiros → HTTP $STATUS ($COUNT parceiros)"
  # Pegar ID do primeiro parceiro para testes seguintes
  PARCEIRO_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); arr=d.get('parceiros',d) if isinstance(d,dict) else d; print(arr[0]['id'] if arr else '')" 2>/dev/null || echo "")
  PARCEIRO_NOME=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); arr=d.get('parceiros',d) if isinstance(d,dict) else d; print(arr[0].get('nome_empresa','') if arr else '')" 2>/dev/null || echo "")
  echo "  Primeiro parceiro: $PARCEIRO_NOME ($PARCEIRO_ID)"
else
  fail "/parceiros → HTTP $STATUS — $BODY"
  PARCEIRO_ID=""
fi

# ── 5. Detalhe do parceiro ────────────────────────────────────
if [ -n "$PARCEIRO_ID" ]; then
  sep "5. API /parceiros/:id"
  DET_RESP=$(/usr/bin/curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$BASE/api/portal/parceiros/$PARCEIRO_ID" -w "\n__STATUS__%{http_code}")
  STATUS=$(echo "$DET_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
  BODY=$(echo "$DET_RESP" | grep -v "__STATUS__")
  [ "$STATUS" = "200" ] && ok "/parceiros/$PARCEIRO_ID → HTTP $STATUS" || fail "/parceiros/$PARCEIRO_ID → HTTP $STATUS — $BODY"
fi

# ── 6. Usar cupom (POST /usar) ────────────────────────────────
if [ -n "$PARCEIRO_ID" ]; then
  sep "6. USAR CUPOM (POST /parceiros/:id/usar)"
  USO_RESP=$(/usr/bin/curl -s -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$BASE/api/portal/parceiros/$PARCEIRO_ID/usar" \
    -H "Content-Type: application/json" \
    -w "\n__STATUS__%{http_code}")
  STATUS=$(echo "$USO_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
  BODY=$(echo "$USO_RESP" | grep -v "__STATUS__")
  if [ "$STATUS" = "200" ]; then
    ok "Usar cupom → HTTP $STATUS — $BODY"
  elif [ "$STATUS" = "429" ]; then
    ok "Usar cupom → HTTP 429 (limite de frequência funcionando) — $BODY"
  else
    fail "Usar cupom → HTTP $STATUS — $BODY"
  fi

  sep "6b. USAR CUPOM DUAS VEZES (deve bloquear ou permitir conforme frequência)"
  USO2_RESP=$(/usr/bin/curl -s -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$BASE/api/portal/parceiros/$PARCEIRO_ID/usar" \
    -H "Content-Type: application/json" \
    -w "\n__STATUS__%{http_code}")
  STATUS2=$(echo "$USO2_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
  BODY2=$(echo "$USO2_RESP" | grep -v "__STATUS__")
  if [ "$STATUS2" = "429" ]; then
    ok "Segundo uso → HTTP 429 (bloqueio de duplicata funcionando)"
    echo "  $BODY2"
  elif [ "$STATUS2" = "200" ]; then
    ok "Segundo uso → HTTP 200 (parceiro tem uso ilimitado)"
  else
    fail "Segundo uso → HTTP $STATUS2 — $BODY2"
  fi
fi

# ── 7. Notificações ───────────────────────────────────────────
sep "7. NOTIFICAÇÕES"
NOTIF_RESP=$(/usr/bin/curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "$BASE/api/portal/notificacoes" -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$NOTIF_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
BODY=$(echo "$NOTIF_RESP" | grep -v "__STATUS__")
if [ "$STATUS" = "200" ]; then
  COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); arr=d.get('notificacoes',d) if isinstance(d,dict) else d; print(len(arr))" 2>/dev/null || echo "?")
  ok "Notificações → HTTP $STATUS ($COUNT notificações)"
else
  fail "Notificações → HTTP $STATUS — $BODY"
fi

# ── 8. Refresh token ──────────────────────────────────────────
sep "8. REFRESH TOKEN"
REF_RESP=$(/usr/bin/curl -s -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "$BASE/api/auth/refresh" -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$REF_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
BODY=$(echo "$REF_RESP" | grep -v "__STATUS__")
[ "$STATUS" = "200" ] && ok "Refresh → HTTP $STATUS — $BODY" || fail "Refresh → HTTP $STATUS — $BODY"

# ── 9. Logout ─────────────────────────────────────────────────
sep "9. LOGOUT"
LOG_RESP=$(/usr/bin/curl -s -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  "$BASE/api/auth/logout" -w "\n__STATUS__%{http_code}")
STATUS=$(echo "$LOG_RESP" | grep "__STATUS__" | sed 's/__STATUS__//')
[ "$STATUS" = "200" ] || [ "$STATUS" = "204" ] && ok "Logout → HTTP $STATUS" || fail "Logout → HTTP $STATUS"

# ── 10. Verificar que sessão foi encerrada ─────────────────────
sep "10. SESSÃO ENCERRADA"
CODE=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/portal/me")
[ "$CODE" = "401" ] && ok "/me após logout → HTTP 401 (sessão encerrada)" || fail "/me após logout → HTTP $CODE (esperado 401)"

# ── Resultado final ───────────────────────────────────────────
echo ""
echo "══════════════════════════════════"
if [ "$FALHAS" = "0" ]; then
  echo "  TODOS OS TESTES PASSARAM"
else
  echo "  $FALHAS TESTE(S) FALHARAM"
fi
echo "══════════════════════════════════"
exit $FALHAS
