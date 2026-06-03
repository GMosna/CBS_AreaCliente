import { Header } from '@/components/portal/Header';
import { BottomNav } from '@/components/portal/BottomNav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Header />
      <main className="portal-main">{children}</main>
      <BottomNav />
    </div>
  );
}
