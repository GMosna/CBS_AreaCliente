'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/portal/dashboard',     label: 'Dashboard' },
  { href: '/portal/parceiros',     label: 'Parceiros' },
  { href: '/portal/notificacoes',  label: 'Notificações' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Navegação do portal">
      <ul className="sidebar-nav">
        {NAV_ITEMS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`sidebar-link ${pathname.startsWith(href) ? 'active' : ''}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
