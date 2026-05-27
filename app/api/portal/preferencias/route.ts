// ============================================================
// SASSI IMÓVEIS — GET/PATCH /api/portal/preferencias
// Gerencia preferências de notificação por e-mail do inquilino.
// Rate limit: 10 atualizações por hora por inquilino.
// ============================================================

import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const inquilinoId = (await headers()).get('x-inquilino-id');
  if (!inquilinoId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data } = await getSupabase()
    .from('inquilinos')
    .select('email_notificacoes, email')
    .eq('id', inquilinoId)
    .single();

  return NextResponse.json({
    email_notificacoes: data?.email_notificacoes ?? false,
    email:              data?.email ?? '',
  });
}

const PatchSchema = z.object({
  email_notificacoes: z.boolean(),
  email: z.string().email('E-mail inválido').max(254).optional(),
});

export async function PATCH(request: NextRequest) {
  const inquilinoId = (await headers()).get('x-inquilino-id');
  if (!inquilinoId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Rate limit: máximo 10 atualizações por hora
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('inquilino_id', inquilinoId)
    .eq('acao', 'preferencia_atualizada')
    .gte('created_at', umaHoraAtras);

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Limite de atualizações atingido. Tente novamente em breve.' },
      { status: 429 }
    );
  }

  const updateData: Record<string, unknown> = {
    email_notificacoes: parsed.data.email_notificacoes,
  };
  if (parsed.data.email !== undefined) {
    updateData.email = parsed.data.email;
  }

  const { error } = await supabase
    .from('inquilinos')
    .update(updateData)
    .eq('id', inquilinoId);

  if (error) {
    console.error('[preferencias] Erro ao salvar:', error.message);
    return NextResponse.json({ error: 'Erro ao salvar preferências.' }, { status: 500 });
  }

  // Log para o rate limit (aguarda para garantir contagem correta)
  await logAudit('preferencia_atualizada', request, inquilinoId, {
    email_notificacoes: parsed.data.email_notificacoes,
  });

  return NextResponse.json({ ok: true });
}
