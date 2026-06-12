'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { ParceiroListItem } from '@/types/parceiro';
import { buildWhatsAppUrl } from '@/utils/whatsapp';
import { resolveLogoUrl } from '@/utils/logo';
import { CupomFisico } from './CupomFisico';

interface BloqueioInfo {
  mensagem: string;
  proximoUsoEm: string | null;
}

interface DiscountModalProps {
  parceiro: ParceiroListItem;
  open: boolean;
  onClose: () => void;
}

function formatarDataHora(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatarBloqueio(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DiscountModal({ parceiro, open, onClose }: DiscountModalProps) {
  const [carregando, setCarregando]           = useState(false);
  const [bloqueio, setBloqueio]               = useState<BloqueioInfo | null>(null);
  const [cupomGerado, setCupomGerado]         = useState(false);
  const [protocolo, setProtocolo]             = useState<string | null>(null);
  const [protocoloId, setProtocoloId]         = useState<string | null>(null);
  const [inquilinoEmail, setInquilinoEmail]   = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus]   = useState<'idle' | 'loading' | 'done'>('idle');
  const [enviandoEmail, setEnviandoEmail]     = useState(false);
  const [emailEnviado, setEmailEnviado]       = useState(false);
  const resgateEmRef                          = useRef<Date | null>(null);

  const temCupom = Boolean(parceiro.codigo_cupom?.trim());
  const inicial  = parceiro.nome_empresa.charAt(0).toUpperCase();

  // Limpar estado ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setCarregando(false);
      setBloqueio(null);
      setCupomGerado(false);
      setProtocolo(null);
      setProtocoloId(null);
      setInquilinoEmail(null);
      setDownloadStatus('idle');
      setEnviandoEmail(false);
      setEmailEnviado(false);
      resgateEmRef.current = null;
    }
  }, [open]);

  // Audit de visualização
  useEffect(() => {
    if (!open) return;
    fetch(`/api/portal/parceiros/${parceiro.id}`, { method: 'POST' }).catch(() => {});
  }, [open, parceiro.id]);

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useScrollLock(open);

  // ── Resgatar benefício ───────────────────────────────────────
  async function handleResgatarBeneficio() {
    if (carregando) return;
    setCarregando(true);
    setBloqueio(null);

    try {
      const res = await fetch(`/api/portal/parceiros/${parceiro.id}/usar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.sucesso) {
        window.dispatchEvent(new CustomEvent('cupom-usado'));
        resgateEmRef.current = new Date();
        setProtocolo(data.protocolo ?? '0001');
        setProtocoloId(data.protocoloId ?? null);
        setInquilinoEmail(data.inquilinoEmail ?? null);
        setCupomGerado(true);
      } else if (res.status === 429) {
        setBloqueio({
          mensagem: data.mensagem ?? 'Benefício temporariamente indisponível.',
          proximoUsoEm: data.proximoUsoEm ?? null,
        });
      }
    } catch {
      // silently fail
    } finally {
      setCarregando(false);
    }
  }

  // ── Download como imagem ────────────────────────────────────
  async function handleDownloadCupom() {
    if (downloadStatus === 'loading') return;
    setDownloadStatus('loading');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { toPng } = await import('html-to-image' as any);
      const el = document.getElementById('cupom-fisico');
      if (!el) throw new Error('Elemento não encontrado');
      const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `cupom-${parceiro.nome_empresa.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadStatus('done');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch {
      setDownloadStatus('idle');
      alert('Não foi possível gerar o cupom. Tente novamente.');
    }
  }

  // ── Enviar por email ─────────────────────────────────────────
  async function handleEnviarEmail() {
    if (enviandoEmail || emailEnviado || !protocoloId) return;
    setEnviandoEmail(true);
    try {
      await fetch(`/api/portal/parceiros/${parceiro.id}/enviar-cupom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocoloId }),
      });
      setEmailEnviado(true);
    } catch {
      // silently fail
    } finally {
      setEnviandoEmail(false);
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────
  function abrirWhatsApp() {
    const url = buildWhatsAppUrl(parceiro.whatsapp ?? '');
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    fetch(`/api/portal/parceiros/${parceiro.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'clicou_whatsapp' }),
    }).catch(() => {});
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Benefício: ${parceiro.nome_empresa}`}
    >
      <div className="absolute inset-0 bg-black/75 animate-fade-in" onClick={onClose} />

      <div
        className={[
          'relative z-10 w-full bg-[var(--color-surface)] border-t border-[var(--color-border)]',
          'rounded-t-3xl md:rounded-2xl md:border md:max-w-lg md:mx-4',
          'max-h-[90vh] overflow-y-auto',
          'animate-slide-up md:animate-scale-in',
        ].join(' ')}
      >
        {/* Drag indicator — mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-[#981c1c] flex items-center justify-center">
                {resolveLogoUrl(parceiro.logo_url) ? (
                  <img
                    src={resolveLogoUrl(parceiro.logo_url)!}
                    alt={parceiro.nome_empresa}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-display text-3xl text-white">{inicial}</span>
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl tracking-wide text-[var(--color-text)] leading-tight">
                  {parceiro.nome_empresa.toUpperCase()}
                </h2>
                {parceiro.segmento && (
                  <span className="inline-block mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full">
                    {parceiro.segmento}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors shrink-0"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Vista: pré-resgate ─────────────────────────────── */}
          {!cupomGerado && (
            <>
              {/* Box benefício */}
              <div className="bg-[#981c1c]/15 border border-[#e43333]/30 rounded-2xl p-5 mb-6">
                <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2 font-medium">
                  Seu Benefício
                </p>
                <p className="text-[var(--color-text)] text-base leading-relaxed font-medium">
                  {parceiro.desconto_descricao}
                </p>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-3">
                {temCupom ? (
                  <>
                    {!bloqueio ? (
                      <button
                        onClick={handleResgatarBeneficio}
                        disabled={carregando}
                        className={[
                          'w-full py-4 px-8 rounded-xl font-bold text-lg',
                          'flex items-center justify-center gap-2 transition-all duration-200',
                          carregando
                            ? 'bg-[#e43333]/50 text-white cursor-not-allowed'
                            : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
                        ].join(' ')}
                      >
                        {carregando ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Verificando...
                          </>
                        ) : (
                          <>🎟️ Resgatar benefício</>
                        )}
                      </button>
                    ) : (
                      <div className="text-center p-4 border border-[#981c1c]/40 rounded-xl bg-[#981c1c]/10">
                        <p className="text-[#e43333] font-medium text-sm">🔒 {bloqueio.mensagem}</p>
                        {bloqueio.proximoUsoEm && (
                          <p className="text-[var(--color-text-muted)] text-xs mt-1">
                            Disponível em: {formatarBloqueio(bloqueio.proximoUsoEm)}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center text-[var(--color-text-muted)] text-sm">
                    Apresente este benefício na loja
                  </p>
                )}

                {/* WhatsApp */}
                {parceiro.whatsapp && (
                  <button
                    onClick={abrirWhatsApp}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#25d366] hover:text-[#25d366] flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                    </svg>
                    Falar no WhatsApp
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </>
          )}

          {/* ── Vista: cupom gerado ────────────────────────────── */}
          {cupomGerado && (
            <div className="space-y-4">
              {/* Benefício em destaque */}
              <div className="bg-[#981c1c]/20 border border-[#e43333]/30 rounded-xl p-4 text-center">
                <p className="text-[#e43333] font-bold text-base leading-relaxed">
                  {parceiro.desconto_descricao}
                </p>
              </div>

              {/* Código do cupom */}
              {parceiro.codigo_cupom && (
                <div className="rounded-xl overflow-hidden">
                  <div className="bg-[#e43333] px-4 py-2 text-center">
                    <p className="text-white text-xs uppercase tracking-widest font-bold">
                      Código do Cupom
                    </p>
                  </div>
                  <div className="bg-[#981c1c] px-6 py-5 text-center">
                    <p
                      className="font-mono text-3xl font-black text-white tracking-[0.3em] select-all"
                    >
                      {parceiro.codigo_cupom}
                    </p>
                  </div>
                </div>
              )}

              {/* Protocolo */}
              <div className="border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                      Protocolo de resgate
                    </p>
                    <p className="text-[var(--color-text)] font-mono font-bold text-2xl mt-1">
                      #{protocolo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                      Resgatado em
                    </p>
                    <p className="text-[var(--color-text)] text-sm mt-1">
                      {resgateEmRef.current ? formatarDataHora(resgateEmRef.current) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 text-center space-y-1">
                <p className="text-[var(--color-text)] text-sm font-medium">
                  📱 Salve seu cupom antes de ir à loja
                </p>
                <p className="text-[var(--color-text-muted)] text-xs">
                  Apresente o cupom ou o protocolo ao atendente
                </p>
              </div>

              {/* LGPD — apenas lojas físicas */}
              {(parceiro.tipo_loja === 'fisica' || parceiro.tipo_loja === 'ambos' || !parceiro.tipo_loja) && (
                <p className="text-[var(--color-text-subtle)] text-xs text-center px-2 leading-relaxed">
                  ℹ️ Seu primeiro nome é compartilhado com{' '}
                  <strong className="text-[var(--color-text-muted)]">{parceiro.nome_empresa}</strong>{' '}
                  para facilitar seu atendimento.
                </p>
              )}

              {/* Botões */}
              <div className="flex flex-col gap-2">
                {/* Baixar */}
                <button
                  onClick={handleDownloadCupom}
                  disabled={downloadStatus === 'loading'}
                  className={[
                    'w-full py-3 px-6 rounded-xl font-bold text-sm',
                    'flex items-center justify-center gap-2 transition-all duration-200',
                    downloadStatus === 'done'
                      ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]'
                      : downloadStatus === 'loading'
                        ? 'bg-[#e43333]/50 text-white cursor-not-allowed'
                        : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
                  ].join(' ')}
                >
                  {downloadStatus === 'loading' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Gerando...
                    </>
                  ) : downloadStatus === 'done' ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Baixado!
                    </>
                  ) : (
                    <>⬇️ Baixar cupom</>
                  )}
                </button>

                {/* Email */}
                <button
                  onClick={handleEnviarEmail}
                  disabled={enviandoEmail || emailEnviado || !inquilinoEmail || !protocoloId}
                  className={[
                    'w-full py-3 px-6 rounded-xl font-bold text-sm',
                    'flex items-center justify-center gap-2 transition-all duration-200 border',
                    emailEnviado
                      ? 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]'
                      : !inquilinoEmail
                        ? 'border-[var(--color-border)] text-[var(--color-text-subtle)] cursor-not-allowed opacity-50'
                        : enviandoEmail
                          ? 'border-[#e43333]/30 text-[#e43333] cursor-not-allowed opacity-70'
                          : 'border-[#e43333] text-[#e43333] hover:bg-[#e43333]/10',
                  ].join(' ')}
                >
                  {emailEnviado ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Email enviado!
                    </>
                  ) : enviandoEmail ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando...
                    </>
                  ) : inquilinoEmail ? (
                    <>
                      📧 Receber por email{' '}
                      <span className="font-normal text-xs opacity-75">({inquilinoEmail})</span>
                    </>
                  ) : (
                    <>📧 Sem email cadastrado</>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors border border-transparent hover:border-[var(--color-border)]"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CupomFisico renderizado fora de tela — capturado pelo html-to-image */}
      {cupomGerado && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '360px' }}>
          <CupomFisico parceiro={parceiro} />
        </div>
      )}
    </div>
  );
}
