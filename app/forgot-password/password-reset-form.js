'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/browser';

export default function PasswordResetForm() {
  const [status, setStatus] = useState('idle');

  async function requestPasswordReset(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim().toLowerCase();

    setStatus('loading');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`
    });

    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p className="catalog-success" role="status">
        Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.
      </p>
    );
  }

  return (
    <form className="auth-form" onSubmit={requestPasswordReset}>
      {status === 'error' ? (
        <p className="form-error" role="alert">
          No se pudo solicitar el enlace. Inténtalo de nuevo más tarde.
        </p>
      ) : null}

      <label>
        Correo electrónico
        <input name="email" type="email" autoComplete="email" required />
      </label>

      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  );
}
