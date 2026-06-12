import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';
import { parseFrequencia, estaDisponivel } from '@/lib/frequencia-desconto';
import { enviarEmailCupomResgatado } from '@/lib/email';
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
    .select('id, nome_empresa, tipo_loja, frequencia_desconto, desconto_descricao, codigo_cupom, email, responsavel')
    .eq('id', parceiroId)
    .eq('ativo', true)
    .eq('aprovado', true)
    .single();

  if (!parceiro) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  const config = parseFrequencia(parceiro.frequencia_desconto);

  // 2. Verificar disponibilidade
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 370);

  const { data: usosExistentes } = await supabase
    .from('uso_descontos')
    .select('usado_em')
    .eq('inquilino_id', inquilinoId)
    .eq('parceiro_id', parceiroId)
    .gte('usado_em', cutoff.toISOString());
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

  // 3. Registrar uso (retorna o id para vincular ao protocolo)
  const dataResgate = new Date();
  const { data: uso } = await supabase
    .from('uso_descontos')
    .insert({
      inquilino_id: inquilinoId,
      parceiro_id: parceiroId,
      usado_em: dataResgate.toISOString(),
    })
    .select('id')
    .single();

  // 4. Gerar protocolo sequencial por parceiro
  let protocoloFormatado = '0001';
  let protocoloId: string | null = null;

  if (uso?.id) {
    const { data: numeroData } = await supabase
      .rpc('proximo_protocolo', { p_parceiro_id: parceiroId });

    const numero = (numeroData as number) ?? 1;
    protocoloFormatado = String(numero).padStart(4, '0');

    const { data: protRec } = await supabase
      .from('protocolos_cupom')
      .insert({
        uso_id: uso.id,
        parceiro_id: parceiroId,
        inquilino_id: inquilinoId,
        numero_protocolo: numero,
      })
      .select('id')
      .single();

    protocoloId = protRec?.id ?? null;
  }

  // 5. Audit log
  const acao: AuditAcao =
    parceiro.tipo_loja === 'online' ? 'copiou_codigo_online' : 'visualizou_cupom_fisico';
  await logAudit(acao, request, inquilinoId, { parceiro_id: parceiroId });

  // 6. Buscar dados do inquilino (email para exibir no frontend + nome para email representante)
  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('nome, email')
    .eq('id', inquilinoId)
    .single();

  // 7. Notificar representante por e-mail (loja física ou ambos) — fire-and-forget
  if ((parceiro.tipo_loja === 'fisica' || parceiro.tipo_loja === 'ambos') && inquilino?.nome) {
    enviarEmailCupomResgatado({
      parceiro,
      nomeInquilino: inquilino.nome,
      dataResgate,
      numeroProtocolo: protocoloFormatado,
    }).catch((err: unknown) =>
      console.error('[email-cupom] Falha ao enviar:', (err as Error).message)
    );
  }

  return NextResponse.json(
    {
      sucesso: true,
      protocolo: protocoloFormatado,
      protocoloId,
      inquilinoEmail: inquilino?.email ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
