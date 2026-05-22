import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parceiros')
    .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, created_at')
    .eq('id', params.id)
    .eq('ativo', true)
    .eq('aprovado', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ parceiro: data });
}

// POST: registra visualização no audit_log (disparado pelo DiscountModal)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  await logAudit('visualizou_parceiro', request, inquilinoId, { parceiro_id: params.id });
  return NextResponse.json({ ok: true });
}
