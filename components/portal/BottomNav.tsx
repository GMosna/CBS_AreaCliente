'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotificacoes } from '@/hooks/useNotificacoes';

const NAV = [
  {
    href:  '/portal/dashboard',
    label: 'Início',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#e43333' : '#6b7280'} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href:  '/portal/parceiros',
    label: 'Parceiros',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#e43333' : '#6b7280'} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href:  '/portal/notificacoes',
    label: 'Avisos',
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#e43333' : '#6b7280'} strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    badge: true,
  },
];

export function BottomNav() {
  const pathname    = usePathname();
  const { naoLidas } = useNotificacoes();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#111] border-t border-[#2a2a2a]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch h-16">
        {NAV.map(({ href, label, icon, badge }) => {
          const active =
            pathname === href ||
            (href !== '/portal/dashboard' && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex-1 flex flex-col items-center justify-center gap-1',
                'transition-colors duration-150 active:opacity-70',
                active ? 'text-[#e43333]' : 'text-[#6b7280]',
              ].join(' ')}
            >
              <div className="relative">
                {icon(active)}
                {badge && naoLidas > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-[#e43333] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-[#e43333]' : 'text-[#6b7280]'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
