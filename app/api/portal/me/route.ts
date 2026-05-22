// GET /api/portal/me — retorna dados básicos do inquilino autenticado
// O middleware já validou o JWT e injetou x-inquilino-id nos headers.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    .from('inquilinos')
    .select('id, nome')
    .eq('id', inquilinoId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Inquilino não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, nome: data.nome, role: 'inquilino' });
}
