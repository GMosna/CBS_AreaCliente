// ============================================================
// SASSI IMÓVEIS — Notificações globais
// Cria uma notificação para cada inquilino ativo e, para os que
// optaram por e-mail, envia via Resend (nunca quebra o fluxo).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { enviarEmailNovoParceiro } from './email';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CHUNK = 500; // inserções por lote para evitar limites do Supabase

/**
 * Cria uma notificação para TODOS os inquilinos ativos.
 * Para os que têm email_notificacoes=true e email válido, envia e-mail também.
 */
export async function criarNotificacaoGlobal({
  titulo,
  mensagem,
  tipo,
  nomeParceiro,
  segmento,
  desconto,
}: {
  titulo: string;
  mensagem: string;
  tipo: string;
  nomeParceiro: string;
  segmento?: string | null;
  desconto?: string | null;
}): Promise<void> {
  const supabase = getSupabase();

  const { data: inquilinos, error } = await supabase
    .from('inquilinos')
    .select('id, email_notificacoes, email')
    .eq('ativo', true);

  if (error || !inquilinos || inquilinos.length === 0) {
    if (error) console.error('[notificacoes] Erro ao buscar inquilinos:', error.message);
    return;
  }

  // Inserção em lotes
  for (let i = 0; i < inquilinos.length; i += CHUNK) {
    const lote = inquilinos.slice(i, i + CHUNK).map((inq) => ({
      inquilino_id: inq.id,
      titulo,
      mensagem,
      tipo,
    }));
    const { error: insertError } = await supabase.from('notificacoes').insert(lote);
    if (insertError) {
      console.error('[notificacoes] Erro ao inserir lote:', insertError.message);
    }
  }

  // Envio de e-mails (fire and forget — nunca bloqueia o fluxo de aprovação)
  const comEmail = inquilinos.filter(
    (i) => i.email_notificacoes && typeof i.email === 'string' && i.email.includes('@')
  );

  for (const inq of comEmail) {
    enviarEmailNovoParceiro({
      email:        inq.email as string,
      nomeParceiro,
      segmento,
      desconto,
    }).catch((err) => {
      console.error('[notificacoes] Falha ao enviar e-mail:', err);
    });
  }
}
