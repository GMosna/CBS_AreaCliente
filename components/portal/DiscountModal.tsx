'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { isIlimitado } from '@/lib/frequencia-desconto';
import type { ParceiroListItem } from '@/types/parceiro';
import { buildWhatsAppUrl } from '@/utils/whatsapp';
import { resolveLogoUrl } from '@/utils/logo';
import { CupomFisico } from './CupomFisico';

// ============================================================
// CupomModal — exibe o CupomFisico com opções de baixar/copiar
// ============================================================

interface CupomModalProps {
  parceiro: ParceiroListItem;
  onClose: () => void;
}

function CupomModal({ parceiro, onClose }: CupomModalProps) {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [copiouCodigo, setCopiouCodigo] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function baixarCupom() {
    setDownloadStatus('loading');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { toPng } = await import('html-to-image' as any);
      const el = document.getElementById('cupom-fisico');
      if (!el) throw new Error('Elemento cupom-fisico não encontrado');
      const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `cupom-${parceiro.nome_empresa.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadStatus('done');
      setTimeout(() => setDownloadStatus('idle'), 3000);
      fetch(`/api/portal/parceiros/${parceiro.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'baixou_cupom' }),
      }).catch(() => {});
    } catch (err) {
      console.error('[CupomModal] Falha ao gerar PNG:', err);
      setDownloadStatus('idle');
      alert('Não foi possível gerar o cupom. Tente novamente.');
    }
  }

  async function copiarCodigo() {
    const codigo = parceiro.codigo_cupom;
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = codigo;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        alert(`Código: ${codigo}`);
        return;
      }
    }
    setCopiouCodigo(true);
    setTimeout(() => setCopiouCodigo(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Cupom físico"
    >
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />

      <div className="relative z-10 flex flex-col items-center gap-4 p-4 max-w-sm w-full mx-4">
        <CupomFisico parceiro={parceiro} />

        <div className="flex flex-col gap-2 w-full" style={{ maxWidth: '360px' }}>
          <button
            onClick={baixarCupom}
            disabled={downloadStatus === 'loading'}
            className={[
              'w-full py-3 px-4 rounded-xl font-semibold text-sm',
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
              <>⬇ Baixar cupom</>
            )}
          </button>

          {parceiro.codigo_cupom && (
            <button
              onClick={copiarCodigo}
              className={[
                'w-full py-3 px-4 rounded-xl font-semibold text-sm',
                'flex items-center justify-center gap-2 transition-all duration-200 border',
                copiouCodigo
                  ? 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]'
                  : 'bg-transparent border-[#3a3a3a] text-[#9ca3af] hover:border-white hover:text-white',
              ].join(' ')}
            >
              {copiouCodigo ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>📋 Copiar código</>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-sm text-[#6b7280] hover:text-white transition-colors border border-transparent hover:border-[#2a2a2a]"
          >
            ✕ Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DiscountModal — modal principal com lógica de tipo_loja
// ============================================================

interface BloqueioInfo {
  mensagem: string;
  proximoUsoEm: string | null;
}

interface DiscountModalProps {
  parceiro: ParceiroListItem;
  open: boolean;
  onClose: () => void;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DiscountModal({ parceiro, open, onClose }: DiscountModalProps) {
  const [copiouCodigo, setCopiouCodigo] = useState(false);
  const [cupomModalOpen, setCupomModalOpen] = useState(false);

  // Estado de uso / bloqueio
  const [codigoVisivel, setCodigoVisivel] = useState(false);
  const [carregandoUso, setCarregandoUso] = useState(false);
  const [bloqueio, setBloqueio] = useState<BloqueioInfo | null>(null);
  const [novoResgate, setNovoResgate] = useState(false);

  const temCupom = Boolean(parceiro.codigo_cupom?.trim());
  const tipoLoja = parceiro.tipo_loja ?? (temCupom ? 'fisica' : null);

  // Resetar todo o estado ao fechar o modal
  useEffect(() => {
    if (open) {
      setBloqueio(null);
    } else {
      setCodigoVisivel(false);
      setCarregandoUso(false);
      setBloqueio(null);
      setNovoResgate(false);
      setCupomModalOpen(false);
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

  // ── Lógica de uso ────────────────────────────────────────

  async function handleVerCupom(modo: 'fisica' | 'online') {
    if (carregandoUso) return;

    setCarregandoUso(true);
    setBloqueio(null);

    try {
      const res = await fetch(`/api/portal/parceiros/${parceiro.id}/usar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.sucesso) {
        window.dispatchEvent(new CustomEvent('cupom-usado'));
        setNovoResgate(true);

        if (modo === 'fisica') setCupomModalOpen(true);
        else setCodigoVisivel(true);
      } else if (res.status === 429) {
        setBloqueio({
          mensagem: data.mensagem ?? 'Benefício temporariamente indisponível.',
          proximoUsoEm: data.proximoUsoEm ?? null,
        });
      }
    } catch {
      // Falha silenciosa — não bloqueia o usuário
    } finally {
      setCarregandoUso(false);
    }
  }

  // ── Outras ações ─────────────────────────────────────────

  async function copiarCodigo() {
    const codigo = parceiro.codigo_cupom ?? '';
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = codigo;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        alert(`Copie o código abaixo:\n\n${codigo}`);
        return;
      }
    }
    setCopiouCodigo(true);
    setTimeout(() => setCopiouCodigo(false), 2500);
    fetch(`/api/portal/parceiros/${parceiro.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'copiou_codigo_online' }),
    }).catch(() => {});
  }

  function abrirLoja() {
    if (!parceiro.url_loja) return;
    window.open(parceiro.url_loja, '_blank', 'noopener,noreferrer');
    fetch(`/api/portal/parceiros/${parceiro.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'acessou_loja_online' }),
    }).catch(() => {});
  }

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

  const inicial = parceiro.nome_empresa.charAt(0).toUpperCase();

  if (!open) return null;

  // ── Seções reutilizáveis ─────────────────────────────────

  function BloqueioDisplay() {
    if (!bloqueio) return null;
    return (
      <div className="text-center p-4 border border-[#981c1c]/40 rounded-xl bg-[#981c1c]/10 mt-2">
        <p className="text-[#e43333] font-medium text-sm">🔒 {bloqueio.mensagem}</p>
        {bloqueio.proximoUsoEm && (
          <p className="text-[#6b7280] text-xs mt-1">
            Disponível em: {formatarData(bloqueio.proximoUsoEm)}
          </p>
        )}
      </div>
    );
  }

  function AvisoLgpd() {
    if (!novoResgate) return null;
    return (
      <p className="text-[#6b7280] text-xs text-center mt-2 px-2 leading-relaxed">
        ℹ️ Seu primeiro nome é compartilhado com <strong className="text-[#9ca3af]">{parceiro.nome_empresa}</strong> para facilitar seu atendimento.
      </p>
    );
  }

  function BotaoCupomFisico() {
    return (
      <>
        {!bloqueio ? (
          <button
            onClick={() => handleVerCupom('fisica')}
            disabled={carregandoUso}
            className={[
              'w-full py-3 px-4 rounded-xl font-semibold text-sm',
              'flex items-center justify-center gap-2 transition-all duration-200',
              carregandoUso
                ? 'bg-[#e43333]/50 text-white cursor-not-allowed'
                : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
            ].join(' ')}
          >
            {carregandoUso ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verificando...
              </>
            ) : (
              <>🎫 Ver cupom</>
            )}
          </button>
        ) : (
          <BloqueioDisplay />
        )}
        <AvisoLgpd />
      </>
    );
  }

  function SecaoOnline() {
    return (
      <div className="mb-4">
        <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2 font-medium">
          Código online
        </p>

        {codigoVisivel ? (
          // Código revelado
          <>
            <div className="bg-[var(--color-surface-2)] border border-[#e43333]/40 rounded-xl p-4 text-center mb-3">
              <span
                className="text-[var(--color-text)] text-3xl font-bold tracking-widest select-all"
                style={{ fontFamily: 'monospace' }}
              >
                {parceiro.codigo_cupom}
              </span>
              <p className="text-[var(--color-text-subtle)] text-xs mt-2">Cole este código no carrinho</p>
            </div>
            <AvisoLgpd />
            <div className="flex flex-col gap-2">
              <button
                onClick={copiarCodigo}
                className={[
                  'w-full py-3 px-4 rounded-xl font-semibold text-sm',
                  'flex items-center justify-center gap-2 transition-all duration-200',
                  copiouCodigo
                    ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]'
                    : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
                ].join(' ')}
              >
                {copiouCodigo ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copiar código
                  </>
                )}
              </button>
              {parceiro.url_loja && (
                <button
                  onClick={abrirLoja}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-transparent border border-[#2a2a2a] text-[#9ca3af] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] flex items-center justify-center gap-2 transition-all duration-200"
                >
                  Ir para a loja →
                </button>
              )}
            </div>
          </>
        ) : (
          // Código oculto
          <div className="relative mb-3">
            <div className="bg-[var(--color-surface-2)] border border-dashed border-[#333] rounded-xl p-4 text-center blur-sm select-none pointer-events-none">
              <span className="text-[var(--color-text)] text-3xl font-bold tracking-widest" style={{ fontFamily: 'monospace' }}>
                {parceiro.codigo_cupom}
              </span>
              <p className="text-[var(--color-text-subtle)] text-xs mt-2">Cole este código no carrinho</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-[#0d0d0d]/70">
              {!bloqueio ? (
                <button
                  onClick={() => handleVerCupom('online')}
                  disabled={carregandoUso}
                  className={[
                    'py-3 px-6 rounded-lg font-bold text-sm transition-all duration-200',
                    carregandoUso
                      ? 'bg-[#e43333]/50 text-white cursor-not-allowed'
                      : 'bg-[#e43333] hover:bg-[#981c1c] text-white',
                  ].join(' ')}
                >
                  {carregandoUso ? '⏳ Verificando...' : '👁 Ver cupom'}
                </button>
              ) : (
                <div className="text-center p-4 border border-[#981c1c]/40 rounded-xl bg-[#981c1c]/10 mx-4">
                  <p className="text-[#e43333] font-medium text-sm">🔒 {bloqueio.mensagem}</p>
                  {bloqueio.proximoUsoEm && (
                    <p className="text-[#6b7280] text-xs mt-1">
                      Disponível em: {formatarData(bloqueio.proximoUsoEm)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function BotaoWhatsApp() {
    if (!parceiro.whatsapp) return null;
    return (
      <button
        onClick={abrirWhatsApp}
        className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-transparent border border-[#2a2a2a] text-[#9ca3af] hover:border-[#25d366] hover:text-[#25d366] flex items-center justify-center gap-2 transition-all duration-200"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        Falar no WhatsApp
      </button>
    );
  }

  return (
    <>
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

            {/* Box de benefício */}
            <div className="bg-[#981c1c]/15 border border-[#e43333]/30 rounded-2xl p-5 mb-6">
              <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-2 font-medium">
                Seu Benefício
              </p>
              <p className="text-[var(--color-text)] text-base leading-relaxed font-medium selectable">
                {parceiro.desconto_descricao}
              </p>
              <p className="text-[var(--color-text-muted)] text-sm mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#e43333] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {parceiro.frequencia_desconto ?? 'Consultar parceiro'}
              </p>
              {isIlimitado(parceiro.frequencia_desconto) && (
                <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-subtle)] mt-2">
                  <span className="text-[#e43333] shrink-0 mt-0.5">ℹ</span>
                  <span>Uso livre — limitado a <strong className="text-[var(--color-text-muted)]">1 resgate por dia</strong> por cliente.</span>
                </p>
              )}
            </div>

            {/* Ações por tipo_loja */}
            <div className="flex flex-col gap-3">

              {!temCupom && (
                <>
                  <p className="text-center text-[var(--color-text-muted)] text-sm">
                    Apresente este benefício na loja
                  </p>
                  <BotaoWhatsApp />
                </>
              )}

              {temCupom && tipoLoja === 'fisica' && (
                <>
                  <BotaoCupomFisico />
                  <BotaoWhatsApp />
                </>
              )}

              {temCupom && tipoLoja === 'online' && (
                <>
                  <SecaoOnline />
                  <BotaoWhatsApp />
                </>
              )}

              {temCupom && tipoLoja === 'ambos' && (
                <>
                  <div className="border border-[var(--color-border)] rounded-xl p-4 mb-1">
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-3 font-medium flex items-center gap-1.5">
                      🏪 Loja Física
                    </p>
                    <BotaoCupomFisico />
                  </div>
                  <div className="border border-[var(--color-border)] rounded-xl p-4">
                    <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-3 font-medium flex items-center gap-1.5">
                      💻 Loja Online
                    </p>
                    <SecaoOnline />
                  </div>
                  <BotaoWhatsApp />
                </>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {cupomModalOpen && (
        <CupomModal
          parceiro={parceiro}
          onClose={() => setCupomModalOpen(false)}
        />
      )}
    </>
  );
}
