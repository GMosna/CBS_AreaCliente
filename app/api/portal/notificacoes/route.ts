import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Notificacao } from '@/types/notificacao';

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
    .from('notificacoes')
    .select('id, titulo, mensagem, tipo, lida, criada_em')
    .eq('inquilino_id', inquilinoId)
    .order('criada_em', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[notificacoes] Supabase error:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json({ notificacoes: (data ?? []) as Notificacao[] });
}
