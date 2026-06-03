import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ParceiroListItem } from '@/types/parceiro';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parceiros')
    .select('id, nome_empresa, segmento, desconto_descricao, frequencia_desconto, logo_url, destaque, whatsapp, tipo_loja, codigo_cupom, url_loja, created_at')
    .eq('ativo', true)
    .eq('aprovado', true)
    .order('destaque', { ascending: false })
    .order('nome_empresa');

  if (error) {
    console.error('[parceiros] Supabase error:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json({ parceiros: (data ?? []) as ParceiroListItem[] });
}
