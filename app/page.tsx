import { redirect } from 'next/navigation';

// Rota raiz redireciona para /login.
// Usuários autenticados são redirecionados para /portal/dashboard pelo middleware.
export default function RootPage() {
  redirect('/login');
}
