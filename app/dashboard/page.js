import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { logout } from './actions';

const roleLabels = {
  admin: 'Administrador',
  pedidos: 'Departamento de pedidos',
  representante: 'Representante'
};

const statusLabels = {
  pendiente: 'Pendiente',
  gestionado: 'Gestionado'
};

const statusOrder = ['pendiente', 'gestionado'];

function getOrderUnits(order) {
  return (order.order_lines || []).reduce((total, line) => total + (line.quantity || 0), 0);
}

function getTopModels(orders) {
  const counts = new Map();

  orders.forEach((order) => {
    const models = (order.model_name || 'Sin modelo')
      .split(' + ')
      .map((model) => model.trim())
      .filter(Boolean);

    models.forEach((model) => {
      counts.set(model, (counts.get(model) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, active')
    .eq('id', userId)
    .single();

  if (!profile?.active) redirect('/login?error=Usuario%20sin%20acceso%20activo.');

  const isOperationalRole = ['admin', 'pedidos'].includes(profile.role);
  let ordersQuery = supabase
    .from('orders')
    .select('id, order_number, model_name, client_name, status, created_at, order_lines(quantity)')
    .order('created_at', { ascending: false });

  if (!isOperationalRole) {
    ordersQuery = ordersQuery.eq('representative_id', userId);
  }

  const { data: orders } = await ordersQuery;
  const visibleOrders = orders || [];
  const statusCounts = Object.fromEntries(
    statusOrder.map((status) => [status, visibleOrders.filter((order) => order.status === status).length])
  );
  const totalUnits = visibleOrders.reduce((total, order) => total + getOrderUnits(order), 0);
  const topModels = getTopModels(visibleOrders);
  const recentOrders = visibleOrders.slice(0, 5);
  const statusMaximum = Math.max(...Object.values(statusCounts), 1);
  const statisticsTitle = isOperationalRole ? 'Resumen operativo' : 'Resumen de mis pedidos';
  const statisticsDescription = isOperationalRole
    ? 'Vista global de los pedidos a los que tienes acceso.'
    : 'Seguimiento de los pedidos que has enviado.';

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
          <button className="secondary-button" type="submit">Cerrar sesión</button>
        </form>
      </section>

      <section className="dashboard-statistics" aria-labelledby="dashboard-statistics-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACTIVIDAD</p>
            <h2 id="dashboard-statistics-title">{statisticsTitle}</h2>
            <p>{statisticsDescription}</p>
          </div>
          <a className="secondary-button" href="/pedidos">Ver pedidos</a>
        </div>

        <div className="dashboard-stats-grid">
          <article className="dashboard-stat-card">
            <span>Pedidos</span>
            <strong>{visibleOrders.length}</strong>
            <small>Pedidos registrados</small>
          </article>
          <article className="dashboard-stat-card">
            <span>Unidades</span>
            <strong>{totalUnits}</strong>
            <small>Módulos solicitados</small>
          </article>
          <article className="dashboard-stat-card is-pending">
            <span>Pendientes</span>
            <strong>{statusCounts.pendiente}</strong>
            <small>Por revisar</small>
          </article>
          <article className="dashboard-stat-card is-production">
            <span>Gestionados</span>
            <strong>{statusCounts.gestionado}</strong>
            <small>Completados</small>
          </article>
        </div>

        <div className="dashboard-insights-grid">
          <article className="dashboard-insight-card">
            <div className="insight-card-heading">
              <div>
                <p className="eyebrow">MODELOS</p>
                <h3>Más solicitados</h3>
              </div>
              <span className="insight-caption">Por pedidos</span>
            </div>
            {topModels.length ? (
              <ol className="model-ranking">
                {topModels.map((model, index) => (
                  <li key={model.name}>
                    <span className="ranking-position">{index + 1}</span>
                    <strong>{model.name}</strong>
                    <span>{model.count} {model.count === 1 ? 'pedido' : 'pedidos'}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="empty-insight">Aún no hay modelos en pedidos registrados.</p>}
          </article>

          <article className="dashboard-insight-card">
            <div className="insight-card-heading">
              <div>
                <p className="eyebrow">ESTADO</p>
                <h3>Situación de los pedidos</h3>
              </div>
            </div>
            <div className="status-breakdown">
              {statusOrder.map((status) => (
                <div className="status-breakdown-row" key={status}>
                  <div>
                    <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
                    <strong>{statusCounts[status]}</strong>
                  </div>
                  <span className="status-bar-track" aria-hidden="true">
                    <span style={{ width: `${(statusCounts[status] / statusMaximum) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-insight-card dashboard-recent-orders">
            <div className="insight-card-heading">
              <div>
                <p className="eyebrow">ÚLTIMOS PEDIDOS</p>
                <h3>Actividad reciente</h3>
              </div>
            </div>
            {recentOrders.length ? (
              <ul className="recent-orders-list">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <div>
                      <strong>Pedido #{order.order_number}</strong>
                      <span>{order.client_name} · {order.model_name}</span>
                    </div>
                    <div>
                      <span className={`status-pill status-${order.status}`}>{statusLabels[order.status]}</span>
                      <small>{formatDate(order.created_at)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="empty-insight">Cuando se envíe un pedido aparecerá aquí.</p>}
          </article>
        </div>
      </section>

      <section className="next-step-card">
        <h2>Operaciones de pedidos</h2>
        <p>Accede a la bandeja de pedidos según los permisos asignados a tu rol.</p>
        <a className="secondary-button dashboard-link" href="/pedidos">Ir a pedidos</a>
        {profile.role === 'admin' ? <a className="secondary-button dashboard-link" href="/catalog">Gestionar catálogo</a> : null}
        {profile.role === 'admin' ? <a className="secondary-button dashboard-link" href="/usuarios">Gestionar usuarios</a> : null}
      </section>
    </main>
  );
}
