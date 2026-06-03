import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';
import type { AuditAcao } from '@/types/auth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parceiros')
    .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, created_at')
    .eq('id', id)
    .eq('ativo', true)
    .eq('aprovado', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ parceiro: data });
}

const ACOES_VALIDAS = new Set([
  'visualizou_parceiro',
  'visualizou_cupom_fisico',
  'baixou_cupom',
  'copiou_codigo_online',
  'acessou_loja_online',
  'clicou_whatsapp',
]);

// POST: registra ação no audit_log (disparado pelo DiscountModal)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;

  let acao: AuditAcao = 'visualizou_parceiro';
  try {
    const body = await request.json() as { acao?: string };
    if (body.acao && ACOES_VALIDAS.has(body.acao)) {
      acao = body.acao as AuditAcao;
    }
  } catch {
    // body vazio ou não-JSON → usa ação padrão
  }

  await logAudit(acao, request, inquilinoId, { parceiro_id: id });
  return NextResponse.json({ ok: true });
}
