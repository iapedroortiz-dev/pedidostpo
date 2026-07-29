'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

function redirectWithError(message) {
  redirect(`/set-password?error=${encodeURIComponent(message)}`);
}

export async function setPassword(formData) {
  const password = String(formData.get('password') || '');
  const confirmation = String(formData.get('confirmation') || '');

  if (password.length < 12) {
    redirectWithError('La contraseña debe tener al menos 12 caracteres.');
  }

  if (password !== confirmation) {
    redirectWithError('Las contraseñas no coinciden.');
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect('/login?error=La%20sesión%20ha%20caducado.');
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithError('No se pudo actualizar la contraseña. Solicita una nueva invitación.');
  }

  redirect('/dashboard');
}