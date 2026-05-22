import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1 className="error-title">Página não encontrada</h1>
      <p className="error-subtitle">
        A página que você procura não existe ou foi movida.
      </p>
      <Link href="/portal/dashboard">
        <Button>Ir para o Dashboard</Button>
      </Link>
    </div>
  );
}
