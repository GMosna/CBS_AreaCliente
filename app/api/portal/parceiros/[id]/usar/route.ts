import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';
import { parseFrequencia, estaDisponivel } from '@/lib/frequencia-desconto';
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id: parceiroId } = await params;
  const supabase = getSupabase();

  // 1. Verificar se parceiro existe e está ativo
  const { data: parceiro } = await supabase
    .from('parceiros')
    .select('id, tipo_loja, frequencia_desconto')
    .eq('id', parceiroId)
    .eq('ativo', true)
    .eq('aprovado', true)
    .single();

  if (!parceiro) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  const config = parseFrequencia(parceiro.frequencia_desconto);

  // 2. Verificar disponibilidade (buscar usos existentes)
  if (config.tipo !== 'ilimitado') {
    const query = supabase
      .from('uso_descontos')
      .select('usado_em')
      .eq('inquilino_id', inquilinoId)
      .eq('parceiro_id', parceiroId);

    const { data: usosExistentes } = await query;
    const timestamps = (usosExistentes ?? []).map((u: { usado_em: string }) => u.usado_em);

    const check = estaDisponivel(config, timestamps);
    if (!check.disponivel) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: check.mensagem,
          proximoUsoEm: check.proximoUsoEm?.toISOString() ?? null,
        },
        { status: 429 }
      );
    }
  }

  // 3. Registrar uso
  await supabase.from('uso_descontos').insert({
    inquilino_id: inquilinoId,
    parceiro_id: parceiroId,
    usado_em: new Date().toISOString(),
  });

  // 4. Audit log
  const acao: AuditAcao =
    parceiro.tipo_loja === 'online' ? 'copiou_codigo_online' : 'visualizou_cupom_fisico';
  await logAudit(acao, request, inquilinoId, { parceiro_id: parceiroId });

  return NextResponse.json(
    { sucesso: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
