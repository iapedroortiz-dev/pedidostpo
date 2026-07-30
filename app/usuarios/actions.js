'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '../../lib/supabase/admin';
import { createClient } from '../../lib/supabase/server';

const assignableRoles = new Set(['representante', 'pedidos']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectWithError(message) {
  redirect(`/usuarios?error=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();

  if (!profile?.active || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  return userId;
}

function validPassword(password) {
  return password.length >= 12 && /[a-záéíóúñ]/i.test(password) && /\d/.test(password);
}

async function requireManageableUser(admin, userId) {
  const { data: targetProfile, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !targetProfile || targetProfile.role === 'admin') {
    redirectWithError('Esta cuenta no se puede gestionar desde esta página.');
  }
}

export async function createManagedUser(formData) {
  await requireAdmin();

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || '');
  const password = String(formData.get('password') || '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') || '');

  if (!fullName || fullName.length > 120 || !emailPattern.test(email)) {
    redirectWithError('Indica un nombre y correo electrónico válidos.');
  }

  if (!assignableRoles.has(role)) {
    redirectWithError('El rol seleccionado no es válido.');
  }

  if (!validPassword(password)) {
    redirectWithError('La contraseña debe tener al menos 12 caracteres e incluir letras y números.');
  }

  if (password !== passwordConfirmation) {
    redirectWithError('Las contraseñas no coinciden.');
  }

  const admin = createAdminClient();
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  const newUserId = data.user?.id;

  if (createError || !newUserId) {
    console.error('Error creando usuario:', createError);
    redirectWithError('No se pudo crear el usuario. Comprueba que el correo no exista ya.');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, role, active: true })
    .eq('id', newUserId);

  if (profileError) {
    console.error('Error configurando el perfil:', profileError);
    await admin.auth.admin.deleteUser(newUserId);
    redirectWithError('No se pudo configurar el rol del usuario.');
  }

  revalidatePath('/usuarios');
  redirect(`/usuarios?message=${encodeURIComponent(`Usuario ${email} creado con el rol ${role}.`)}`);
}

export async function updateManagedUserRole(formData) {
  const currentUserId = await requireAdmin();
  const userId = String(formData.get('userId') || '').trim();
  const role = String(formData.get('role') || '');

  if (!uuidPattern.test(userId) || !assignableRoles.has(role)) {
    redirectWithError('Los datos de actualización no son válidos.');
  }

  if (userId === currentUserId) {
    redirectWithError('El rol del administrador actual no se puede modificar desde esta página.');
  }

  const admin = createAdminClient();
  await requireManageableUser(admin, userId);
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId);

  if (error) {
    console.error('Error actualizando rol:', error);
    redirectWithError('No se pudo actualizar el rol del usuario.');
  }

  revalidatePath('/usuarios');
  redirect('/usuarios?message=Rol%20actualizado%20correctamente.');
}

export async function setManagedUserActive(formData) {
  const currentUserId = await requireAdmin();
  const userId = String(formData.get('userId') || '').trim();
  const active = String(formData.get('active') || '') === 'true';

  if (!uuidPattern.test(userId)) {
    redirectWithError('El usuario seleccionado no es válido.');
  }

  if (userId === currentUserId) {
    redirectWithError('No puedes desactivar tu propia cuenta desde esta página.');
  }

  const admin = createAdminClient();
  await requireManageableUser(admin, userId);
  const { error } = await admin.from('profiles').update({ active }).eq('id', userId);

  if (error) {
    console.error('Error actualizando acceso:', error);
    redirectWithError('No se pudo actualizar el acceso del usuario.');
  }

  revalidatePath('/usuarios');
  redirect(`/usuarios?message=${encodeURIComponent(active ? 'Usuario activado.' : 'Usuario desactivado.')}`);
}
