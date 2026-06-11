'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { inquilino, logout }           = useAuth();
  const { naoLidas }                    = useNotificacoes();
  const pathname                        = usePathname();
  const [menuOpen, setMenuOpen]         = useState(false);
  const menuRef                         = useRef<HTMLDivElement>(null);
  const router                          = useRouter();

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inicial = inquilino?.nome?.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4 md:px-6 gap-4 sticky top-0 z-40">

      {/* Logo */}
      <Link href="/portal/dashboard" className="flex items-center gap-3 shrink-0">
        <Image
          src="/SASSI_S_Logo_S.png"
          alt="Sassi Imóveis"
          width={32}
          height={32}
          className="shrink-0"
        />
        <span className="font-display text-lg tracking-[3px] text-[var(--color-text)] hidden sm:block">
          SASSI <span className="text-[#e43333]">IMÓVEIS</span>
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notificações */}
      <Link
        href="/portal/notificacoes"
        className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ''}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#e43333] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </Link>

      {/* Tema claro/escuro */}
      <ThemeToggle />

      {/* Avatar + Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <div className="w-8 h-8 bg-[#981c1c] rounded-lg flex items-center justify-center shrink-0">
            <span className="font-display text-base text-white leading-none">{inicial}</span>
          </div>
          {inquilino && (
            <span className="text-sm text-[var(--color-text)] font-medium hidden md:block max-w-[140px] truncate">
              {inquilino.nome.trim().split(' ')[0]?.trim() || 'Inquilino'}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[var(--color-text-subtle)] transition-transform hidden md:block ${menuOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/40 overflow-hidden animate-scale-in">
            {inquilino && (
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-subtle)]">Logado como</p>
                <p className="text-sm text-[var(--color-text)] font-medium truncate">{inquilino.nome}</p>
              </div>
            )}
            <nav className="py-1">
              <Link
                href="/portal/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${pathname === '/portal/dashboard' ? 'text-[#e43333]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'}`}
              >
                Dashboard
              </Link>
              <Link
                href="/portal/parceiros"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${pathname.startsWith('/portal/parceiros') ? 'text-[#e43333]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'}`}
              >
                Parceiros
              </Link>
              <Link
                href="/portal/notificacoes"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${pathname === '/portal/notificacoes' ? 'text-[#e43333]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'}`}
              >
                Notificações
                {naoLidas > 0 && (
                  <span className="ml-auto w-5 h-5 bg-[#e43333] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </Link>
            </nav>
            <div className="border-t border-[var(--color-border)] py-1">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[#e43333] hover:bg-[var(--color-surface-2)] transition-colors text-left"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

    </header>
  );
}
