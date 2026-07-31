import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  createManagedUser,
  setManagedUserActive,
  updateManagedUserDetails,
  updateManagedUserRole
} from './actions';
import { createClient } from '../../lib/supabase/server';

const roleLabels = {
  admin: 'Administrador',
  pedidos: 'Departamento de pedidos',
  representante: 'Representante'
};

function messageFrom(value) {
  return typeof value === 'string' ? value : '';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default async function UsersPage({ searchParams }) {
  const params = (await searchParams) || {};
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

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active, created_at')
    .order('created_at', { ascending: false });

  const error = messageFrom(params.error);
  const message = messageFrom(params.message);

  return (
    <main className="users-page">
      <header className="users-header">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Usuarios y permisos</h1>
          <p>Da de alta y gestiona las cuentas operativas del sistema.</p>
        </div>
        <Link className="secondary-button users-back" href="/dashboard">Volver al panel</Link>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="catalog-success" role="status">{message}</p> : null}

      <section className="users-panel">
        <p className="eyebrow">ALTA DE USUARIO</p>
        <h2>Nueva cuenta operativa</h2>
        <p className="users-help">La contraseña inicial se comparte por un canal privado. No se almacena ni se vuelve a mostrar en esta aplicación.</p>

        <form action={createManagedUser} className="user-create-form">
          <label>Nombre completo<input name="fullName" maxLength="120" required /></label>
          <label>Correo electrónico<input name="email" type="email" maxLength="320" required /></label>
          <label>Rol<select name="role" defaultValue="representante"><option value="representante">Representante</option><option value="pedidos">Departamento de pedidos</option></select></label>
          <label>Contraseña inicial<input name="password" type="password" minLength="12" autoComplete="new-password" required /></label>
          <label>Repetir contraseña<input name="passwordConfirmation" type="password" minLength="12" autoComplete="new-password" required /></label>
          <button className="primary-button" type="submit">Crear usuario</button>
        </form>
      </section>

      <section className="users-panel">
        <div className="users-list-heading">
          <div><p className="eyebrow">CUENTAS</p><h2>Usuarios registrados</h2></div>
          <span className="users-count">{(users || []).length}</span>
        </div>

        <div className="users-list">
          {(users || []).map((user) => {
            const canManage = user.role !== 'admin' && user.id !== userId;
            return (
              <article className="user-row" key={user.id}>
                <div className="user-details">
                  {canManage ? (
                    <form action={updateManagedUserDetails} className="user-details-form">
                      <input type="hidden" name="userId" value={user.id} />
                      <label>Nombre de usuario<input name="fullName" defaultValue={user.full_name || ''} maxLength="120" required /></label>
                      <label>Email<input name="email" type="email" defaultValue={user.email} maxLength="320" required /></label>
                      <button className="secondary-button" type="submit">Guardar datos</button>
                    </form>
                  ) : (
                    <>
                      <strong>{user.full_name || 'Sin nombre'}</strong>
                      <p>{user.email}</p>
                    </>
                  )}
                  <small>Alta: {formatDate(user.created_at)}</small>
                </div>

                <div className="user-row-actions">
                  <span className={`user-access ${user.active ? 'access-active' : 'access-inactive'}`}>
                    {user.active ? 'Activa' : 'Desactivada'}
                  </span>

                  {canManage ? (
                    <>
                      <form action={updateManagedUserRole} className="user-role-form">
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="role" defaultValue={user.role} aria-label={`Rol de ${user.email}`}>
                          <option value="representante">Representante</option>
                          <option value="pedidos">Departamento de pedidos</option>
                        </select>
                        <button className="secondary-button" type="submit">Guardar rol</button>
                      </form>

                      <form action={setManagedUserActive}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="active" value={user.active ? 'false' : 'true'} />
                        <button className="secondary-button" type="submit">
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="user-role-readonly">{roleLabels[user.role] || user.role}</span>
                  )}
                </div>
              </article>
            );
          })}

          {!users?.length ? <p className="auth-intro">Todavía no hay usuarios registrados.</p> : null}
        </div>
      </section>
    </main>
  );
}
