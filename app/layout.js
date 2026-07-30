import './globals.css';
import { createClient } from '../lib/supabase/server';
import AppShell from './app-shell';

export const metadata = {
  title: 'Pedidos PO',
  description: 'Gestión segura de pedidos'
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  let profile = null;

  if (userId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, role, active')
      .eq('id', userId)
      .maybeSingle();
    profile = profileData?.active ? profileData : null;
  }

  return (
    <html lang="es">
      <body>{profile ? <AppShell profile={profile}>{children}</AppShell> : children}</body>
    </html>
  );
}
