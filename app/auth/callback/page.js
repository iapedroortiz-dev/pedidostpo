'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEmailLinkClient } from '../../../lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function completeAuthentication() {
      const supabase = createEmailLinkClient();
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (!error && data.session) {
        router.replace('/set-password');
        return;
      }

      router.replace(
        '/login?error=No%20se%20pudo%20validar%20el%20enlace.%20Solicita%20uno%20nuevo.'
      );
    }

    completeAuthentication();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">PEDIDOS PO</p>
        <h1>Validando acceso…</h1>
        <p className="auth-intro">
          Estamos preparando tu cuenta de forma segura.
        </p>
      </section>
    </main>
  );
}