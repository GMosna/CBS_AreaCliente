import { Header } from '@/components/portal/Header';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Header />
      <main className="portal-main">{children}</main>
    </div>
  );
}
