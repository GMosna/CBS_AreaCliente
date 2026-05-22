import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const inquilinoId = request.headers.get('x-inquilino-id');
  if (!inquilinoId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', params.id)
    .eq('inquilino_id', inquilinoId); // garante que só pode marcar as próprias

  if (error) {
    console.error('[notificacoes/read] Supabase error:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
