'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const loginError = 'Credenciales no válidas o usuario no confirmado.';

function safeNextPath(value) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

export async function login(formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const nextPath = safeNextPath(String(formData.get('next') || ''));

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent(loginError)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(loginError)}`);
  }

  redirect(nextPath);
}