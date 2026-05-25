'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ── Ícones inline ─────────────────────────────────────────────
const LockIcon = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const WarnIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────
function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ── Página ─────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();

  const [cpf, setCpf]                     = useState('');
  const [dataNascimento, setData]         = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [failedAttempts, setFailed]       = useState(0);
  const [blockedUntil, setBlockedUntil]   = useState<Date | null>(null);
  const [countdown, setCountdown]         = useState('');

  // ── Contador de bloqueio ──────────────────────────────────────
  useEffect(() => {
    if (!blockedUntil) return;
    const tick = () => {
      const diff = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
      if (diff <= 0) { setBlockedUntil(null); setError(''); return; }
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [blockedUntil]);

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || blockedUntil) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), dataNascimento }),
      });

      if (res.ok) {
        router.push('/portal/dashboard');
        return;
      }

      const data = await res.json().catch(() => ({})) as { error?: string; blockedUntil?: string };

      if (res.status === 429 && data.blockedUntil) {
        setBlockedUntil(new Date(data.blockedUntil));
        setError('Muitas tentativas incorretas.');
      } else {
        setError(data.error ?? 'CPF ou data de nascimento inválidos.');
      }
      setFailed((n) => n + 1);
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  }

  const cpfValido       = cpf.replace(/\D/g, '').length === 11;
  const formPreenchido  = cpfValido && dataNascimento.length === 10;
  const hoje            = new Date().toISOString().split('T')[0];

  return (
    <main
      className="min-h-screen bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden px-4 py-12"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '44px 44px',
      }}
    >
      {/* Glow radial de fundo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '640px',
          height: '640px',
          background: 'radial-gradient(circle, rgba(152,28,28,0.07) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">

        {/* ── Logo + título ── */}
        <div
          className="text-center mb-8 opacity-0 animate-fade-up"
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
        >
          <div className="flex justify-center mb-5">
            <Image
              src="/SASSI_S_Logo_S.png"
              alt="Sassi Imóveis"
              width={72}
              height={72}
              priority
              className="drop-shadow-[0_0_16px_rgba(228,51,51,0.35)]"
            />
          </div>
          <h1 className="font-display text-5xl tracking-[5px] text-white leading-none">
            SASSI <span className="text-[#e43333]">IMÓVEIS</span>
          </h1>
          <p className="text-[#9ca3af] text-[11px] tracking-[3px] mt-3 uppercase">
            Clube de Benefícios · Área do Inquilino
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 opacity-0 animate-fade-up"
          style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">

              {/* CPF */}
              <div className="space-y-2">
                <label htmlFor="cpf" className="block text-sm font-medium text-[#9ca3af]">
                  CPF
                </label>
                <div className="relative">
                  <input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                    className={[
                      'w-full bg-[#222] border rounded-lg px-4 py-3 pr-11',
                      'text-white placeholder-[#6b7280] text-base outline-none transition-colors',
                      'focus:border-[#e43333]',
                      error ? 'border-[#e43333]' : 'border-[#2a2a2a]',
                    ].join(' ')}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]">
                    <LockIcon />
                  </span>
                </div>
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <label htmlFor="dataNascimento" className="block text-sm font-medium text-[#9ca3af]">
                  Data de Nascimento
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setData(e.target.value)}
                  max={hoje}
                  aria-invalid={!!error}
                  className={[
                    'w-full bg-[#222] border rounded-lg px-4 py-3',
                    'text-white text-base outline-none transition-colors [color-scheme:dark]',
                    'focus:border-[#e43333]',
                    error ? 'border-[#e43333]' : 'border-[#2a2a2a]',
                  ].join(' ')}
                />
              </div>

              {/* Erro */}
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  className="flex items-start gap-2.5 bg-[#e43333]/10 border border-[#e43333]/25 rounded-lg px-4 py-3"
                >
                  <span className="text-[#e43333]"><AlertIcon /></span>
                  <div>
                    <p className="text-sm text-[#e43333]">{error}</p>
                    {blockedUntil && (
                      <p className="text-xs text-[#9ca3af] mt-1">
                        Tente novamente em <strong className="text-white">{countdown}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Aviso após 3 falhas sem bloqueio */}
              {failedAttempts >= 3 && !blockedUntil && (
                <div className="flex items-center gap-2.5 bg-[#f59e0b]/10 border border-[#f59e0b]/25 rounded-lg px-4 py-3">
                  <span className="text-[#f59e0b]"><WarnIcon /></span>
                  <p className="text-xs text-[#f59e0b]">
                    Dificuldades para acessar? Entre em contato com a Sassi Imóveis.
                  </p>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading || !!blockedUntil || !formPreenchido}
                className={[
                  'w-full py-3.5 rounded-lg font-semibold text-base text-white',
                  'flex items-center justify-center gap-2.5',
                  'transition-all duration-200 active:scale-[0.98]',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
                  'bg-[#e43333] hover:bg-[#981c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e43333]',
                ].join(' ')}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Acessar minha área'
                )}
              </button>

            </div>
          </form>
        </div>

        {/* Rodapé */}
        <p
          className="text-center text-[#6b7280] text-xs mt-6 opacity-0 animate-fade-up"
          style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}
        >
          Apenas inquilinos cadastrados na Sassi Imóveis têm acesso
        </p>

      </div>
    </main>
  );
}
