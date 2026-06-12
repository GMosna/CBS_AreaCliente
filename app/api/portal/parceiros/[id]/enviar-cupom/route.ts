import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarEmailCupomInquilino } from '@/lib/email';

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
  const body = await request.json();
  const { protocoloId } = body as { protocoloId?: string };

  if (!protocoloId) {
    return NextResponse.json({ error: 'protocoloId obrigatório' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Busca o protocolo com dados do parceiro e inquilino, verificando propriedade
  const { data: protocolo } = await supabase
    .from('protocolos_cupom')
    .select(`
      id,
      numero_protocolo,
      gerado_em,
      parceiros ( nome_empresa, desconto_descricao, codigo_cupom, endereco ),
      inquilinos ( nome, email )
    `)
    .eq('id', protocoloId)
    .eq('inquilino_id', inquilinoId)
    .eq('parceiro_id', parceiroId)
    .single();

  if (!protocolo) {
    return NextResponse.json({ error: 'Protocolo não encontrado' }, { status: 404 });
  }

  const inquilino = protocolo.inquilinos as unknown as { nome: string; email: string | null };
  const parceiro  = protocolo.parceiros  as unknown as {
    nome_empresa: string;
    desconto_descricao: string;
    codigo_cupom: string | null;
    endereco: string | null;
  };

  if (!inquilino.email) {
    return NextResponse.json({ error: 'Sem email cadastrado' }, { status: 400 });
  }

  await enviarEmailCupomInquilino({
    nomeInquilino:  inquilino.nome,
    emailInquilino: inquilino.email,
    parceiro,
    numeroProtocolo: String(protocolo.numero_protocolo).padStart(4, '0'),
    geradoEm: new Date(protocolo.gerado_em as string),
  });

  return NextResponse.json({ sucesso: true });
}
