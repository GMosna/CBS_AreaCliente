// ============================================================
// SASSI IMÓVEIS — Envio de e-mail via Gmail SMTP (nodemailer)
// Requer GMAIL_USER e GMAIL_APP_PASSWORD no .env
// Se as variáveis não estiverem configuradas, loga aviso e retorna.
// ============================================================

import nodemailer from 'nodemailer';

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL  ?? 'https://clube.sassiimoveis.com.br';
const FROM_EMAIL = process.env.GMAIL_USER           ?? 'imobiliariasassi@gmail.com';
const FROM_LABEL = `Clube Sassi <${FROM_EMAIL}>`;

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function buildHtml(nomeParceiro: string, segmento?: string | null, desconto?: string | null): string {
  nomeParceiro = escHtml(nomeParceiro);
  segmento     = segmento  ? escHtml(segmento)  : segmento;
  desconto     = desconto  ? escHtml(desconto)  : desconto;
  const segmentoHtml = segmento
    ? `<p style="margin:0 0 16px;color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${segmento}</p>`
    : '';
  const descontoHtml = desconto
    ? `<div style="background:rgba(152,28,28,0.15);border:1px solid rgba(228,51,51,0.3);border-radius:12px;padding:16px 20px;margin:0 0 24px;">
         <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Seu Benefício</p>
         <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">${desconto}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#981c1c;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:4px;">SASSI IMÓVEIS</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Clube de Benefícios</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Novo parceiro disponível</p>
          <h1 style="margin:0 0 12px;color:#fff;font-size:24px;font-weight:700;">${nomeParceiro}</h1>
          ${segmentoHtml}
          ${descontoHtml}
          <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">
            Um novo parceiro foi adicionado ao Clube de Benefícios. Acesse o portal para ver todos os detalhes e aproveitar o desconto.
          </p>
          <a href="${APP_URL}/portal/parceiros"
             style="display:inline-block;background:#e43333;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
            Ver parceiros
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
            Você recebe este e-mail porque habilitou notificações no Clube Sassi.<br/>
            Para cancelar, acesse suas <a href="${APP_URL}/portal/notificacoes" style="color:#9ca3af;">preferências</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================
// E-MAIL PARA O ADMIN — Novo lead aguardando aprovação
// ============================================================

function buildLeadHtml(
  nomeParceiro: string,
  cnpj: string,
  segmento: string | null | undefined,
  responsavel: string | null | undefined,
  whatsapp: string | null | undefined,
  approvalUrl: string,
): string {
  nomeParceiro = escHtml(nomeParceiro);
  cnpj         = escHtml(cnpj);
  segmento     = segmento    ? escHtml(segmento)    : segmento;
  responsavel  = responsavel ? escHtml(responsavel) : responsavel;
  whatsapp     = whatsapp    ? escHtml(whatsapp)    : whatsapp;

  const linhas = [
    segmento   ? `<tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Segmento</td><td style="padding:4px 0 4px 16px;color:#fff;font-size:13px;">${segmento}</td></tr>` : '',
    responsavel ? `<tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Responsável</td><td style="padding:4px 0 4px 16px;color:#fff;font-size:13px;">${responsavel}</td></tr>` : '',
    whatsapp   ? `<tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">WhatsApp</td><td style="padding:4px 0 4px 16px;color:#fff;font-size:13px;">${whatsapp}</td></tr>` : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#981c1c;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:4px;">SASSI IMÓVEIS</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Novo Lead — Clube de Benefícios</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Nova empresa aguardando aprovação</p>
          <h1 style="margin:0 0 20px;color:#fff;font-size:22px;font-weight:700;">${nomeParceiro}</h1>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;width:100%;">
            <tr><td style="padding:12px 16px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">CNPJ</td><td style="padding:4px 0 4px 16px;color:#fff;font-size:13px;font-family:monospace;">${cnpj}</td></tr>
                ${linhas}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">
            Clique no botão abaixo para aprovar este parceiro e torná-lo visível no Clube Sassi.
          </p>
          <a href="${approvalUrl}"
             style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:.5px;">
            ✓ Aprovar Parceiro
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
            Este link é de uso único e expira após a aprovação.<br/>
            Sassi Imóveis — Painel Administrativo
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia e-mail ao admin com botão de aprovação para novo lead/parceiro.
 * O approvalUrl deve ser gerado pelo chamador com HMAC-SHA256(APPROVAL_SECRET, cnpj_digits).
 */
export async function enviarEmailNovoLead({
  nomeParceiro,
  cnpj,
  segmento,
  responsavel,
  whatsapp,
  approvalUrl,
}: {
  nomeParceiro: string;
  cnpj: string;
  segmento?: string | null;
  responsavel?: string | null;
  whatsapp?: string | null;
  approvalUrl: string;
}): Promise<void> {
  const user     = process.env.GMAIL_USER;
  const pass     = process.env.GMAIL_APP_PASSWORD;
  const adminEmails = (process.env.ADMIN_NOTIFICATION_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!user || !pass) {
    console.warn('[email] GMAIL_USER ou GMAIL_APP_PASSWORD não configurado — e-mail de lead não enviado');
    return;
  }
  if (adminEmails.length === 0) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL não configurado — e-mail de lead não enviado');
    return;
  }

  try {
    await getTransporter().sendMail({
      from:    FROM_LABEL,
      to:      adminEmails,
      subject: `Novo Lead — Clube Sassi: ${nomeParceiro}`,
      html:    buildLeadHtml(nomeParceiro, cnpj, segmento, responsavel, whatsapp, approvalUrl),
    });
  } catch (err) {
    console.error('[email] Falha ao enviar lead para admin:', err);
  }
}

// ============================================================
// E-MAIL PARA INQUILINOS — Novo parceiro aprovado
// ============================================================

export async function enviarEmailNovoParceiro({
  email,
  nomeParceiro,
  segmento,
  desconto,
}: {
  email: string;
  nomeParceiro: string;
  segmento?: string | null;
  desconto?: string | null;
}): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[email] GMAIL_USER ou GMAIL_APP_PASSWORD não configurado — e-mail não enviado');
    return;
  }

  try {
    await getTransporter().sendMail({
      from:    FROM_LABEL,
      to:      email,
      subject: `Novo parceiro no Clube Sassi: ${nomeParceiro}`,
      html:    buildHtml(nomeParceiro, segmento, desconto),
    });
  } catch (err) {
    console.error(`[email] Falha ao enviar para ${email}:`, err);
  }
}

// ============================================================
// E-MAIL PARA REPRESENTANTE — Cupom físico resgatado
// ============================================================

function buildCupomResgatadoHtml(
  nomeRepresentante: string,
  nomeEmpresa: string,
  nomeCliente: string,
  inicialSobrenome: string,
  beneficio: string,
  codigoCupom: string | null,
  dataFormatada: string,
  horaFormatada: string,
): string {
  const rep     = escHtml(nomeRepresentante);
  const empresa = escHtml(nomeEmpresa);
  const cliente = escHtml(nomeCliente);
  const inicial = escHtml(inicialSobrenome);
  const ben     = escHtml(beneficio);
  const codigo  = codigoCupom ? escHtml(codigoCupom) : null;

  const codigoHtml = codigo
    ? `<tr>
         <td style="padding:20px 32px;background:#0d0d0d;text-align:center;">
           <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Código do cupom</p>
           <p style="margin:0;color:#e43333;font-size:28px;font-weight:900;letter-spacing:4px;font-family:monospace;">${codigo}</p>
         </td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">

        <!-- Header -->
        <tr><td style="background:#981c1c;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:4px;">SASSI IMÓVEIS</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Clube de Benefícios</p>
        </td></tr>

        <!-- Título -->
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Novo resgate</p>
          <h1 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;font-weight:700;">🎟️ Cupom Resgatado!</h1>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
            Olá, <strong>${rep}</strong>! Um cliente da <strong>Sassi Imóveis</strong> acabou de resgatar
            o benefício da <strong>${empresa}</strong>. Ele pode visitar sua loja em breve!
          </p>
        </td></tr>

        <!-- Dados do resgate -->
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-left:4px solid #e43333;border-radius:8px;overflow:hidden;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="4">
                <tr>
                  <td style="padding:7px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;width:120px;">Cliente</td>
                  <td style="padding:7px 0;color:#1a1a1a;font-size:14px;font-weight:500;border-bottom:1px solid #e5e5e5;">${cliente} ${inicial}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Benefício</td>
                  <td style="padding:7px 0;color:#1a1a1a;font-size:14px;font-weight:500;border-bottom:1px solid #e5e5e5;">${ben}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Data</td>
                  <td style="padding:7px 0;color:#1a1a1a;font-size:14px;font-weight:500;border-bottom:1px solid #e5e5e5;">${dataFormatada}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Hora</td>
                  <td style="padding:7px 0;color:#1a1a1a;font-size:14px;font-weight:500;">${horaFormatada}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        ${codigoHtml}

        <!-- Aviso -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                ⚠️ <strong>Fique atento!</strong> Certifique-se de que sua equipe está ciente do benefício para atender bem este cliente.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f8f8f8;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="margin:0 0 4px;color:#374151;font-size:12px;font-weight:700;">Sassi Imóveis · Clube de Benefícios</p>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:11px;">Limeira/SP · 44 anos de mercado</p>
          <p style="margin:0;color:#9ca3af;font-size:10px;line-height:1.6;">
            Você recebe este e-mail por ser representante de uma empresa parceira do Clube.<br/>
            As informações do cliente são compartilhadas com consentimento para facilitar o atendimento.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia e-mail ao representante da empresa quando um inquilino resgata
 * um cupom de loja física. Fire-and-forget — nunca lançar exceção.
 */
export async function enviarEmailCupomResgatado({
  parceiro,
  nomeInquilino,
  dataResgate,
}: {
  parceiro: {
    nome_empresa: string;
    email: string | null;
    responsavel: string | null;
    desconto_descricao: string;
    codigo_cupom: string | null;
  };
  nomeInquilino: string;
  dataResgate: Date;
}): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!parceiro.email) {
    console.warn(`[email-cupom] ${parceiro.nome_empresa} sem e-mail cadastrado — notificação ignorada`);
    return;
  }
  if (!user || !pass) {
    console.warn('[email-cupom] GMAIL_USER ou GMAIL_APP_PASSWORD não configurado — notificação ignorada');
    return;
  }

  // Dados do cliente mínimos (LGPD)
  const partes = nomeInquilino.trim().split(/\s+/);
  const primeiroNome     = partes[0] ?? 'Cliente';
  const inicialSobrenome = partes.length > 1 ? `${partes[partes.length - 1][0]}.` : '';

  const dataFormatada = dataResgate.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const horaFormatada = dataResgate.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const html = buildCupomResgatadoHtml(
    parceiro.responsavel || 'Representante',
    parceiro.nome_empresa,
    primeiroNome,
    inicialSobrenome,
    parceiro.desconto_descricao,
    parceiro.codigo_cupom,
    dataFormatada,
    horaFormatada,
  );

  try {
    await getTransporter().sendMail({
      from:    FROM_LABEL,
      to:      parceiro.email,
      subject: `🎟️ Novo cupom resgatado — ${parceiro.nome_empresa} · Clube Sassi`,
      html,
    });
    console.log(`[email-cupom] Notificação enviada para ${parceiro.email} (${parceiro.nome_empresa})`);
  } catch (err) {
    console.error('[email-cupom] Falha ao enviar:', (err as Error).message);
  }
}
