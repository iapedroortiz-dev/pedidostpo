import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { logout } from './actions';

const roleLabels = {
  admin: 'Administrador',
  pedidos: 'Departamento de pedidos',
  representante: 'Representante'
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
const userId = data?.claims?.sub;

if (!userId) {
  redirect('/login');
}

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, active')
    .eq('id', userId)
    .single();

  if (!profile?.active) {
    redirect('/login?error=Usuario%20sin%20acceso%20activo.');
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-card">
        <div>
          <p className="eyebrow">SESIÓN ACTIVA</p>
          <h1>Bienvenido, {profile.full_name || 'usuario'}.</h1>
          <p>
            Rol asignado: <strong>{roleLabels[profile.role] || profile.role}</strong>
          </p>
        </div>

        <form action={logout}>
          <button className="secondary-button" type="submit">
            Cerrar sesión
          </button>
        </form>
      </section>

      <section className="next-step-card">
        <h2>Acceso protegido correctamente</h2>
        <p>
          El siguiente paso será migrar los pedidos y el catálogo a Supabase
          respetando los permisos de tu rol.
        </p>
      </section>
    </main>
  );
}