import Link from 'next/link';
import { redirect } from 'next/navigation';
import { advanceOrderStatus, createOrder } from './actions';
import NewOrderForm from './new-order-form';
import { createClient } from '../../lib/supabase/server';

const roleLabels = { admin: 'Administrador', pedidos: 'Departamento de pedidos', representante: 'Representante' };
const statusLabels = { pendiente: 'Pendiente', confirmado: 'Confirmado', en_fabricacion: 'En fabricación' };
const messageFrom = (value) => typeof value === 'string' ? value : '';

function formatDate(value) { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
function formatCreatedAt(value) { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

async function publishedCatalog(supabase) {
  const { data: version } = await supabase.from('catalog_versions').select('id, label').eq('status', 'publicado').maybeSingle();
  if (!version) return null;
  const { data: models } = await supabase.from('catalog_models').select('id, name, display_order').eq('catalog_version_id', version.id).order('display_order');
  const modelIds = (models || []).map((model) => model.id);
  if (!modelIds.length) return { ...version, models: [] };
  const { data: modules } = await supabase.from('catalog_modules').select('id, catalog_model_id, name, needs_side, display_order').in('catalog_model_id', modelIds).order('display_order');
  const moduleIds = (modules || []).map((module) => module.id);
  const { data: variants } = moduleIds.length ? await supabase.from('catalog_module_variants').select('id, catalog_module_id, mechanism, display_order').in('catalog_module_id', moduleIds).order('display_order') : { data: [] };

  return {
    ...version,
    models: (models || []).map((model) => ({
      id: model.id,
      name: model.name,
      modules: (modules || []).filter((module) => module.catalog_model_id === model.id).map((module) => ({
        id: module.id,
        name: module.name,
        needsSide: module.needs_side,
        variants: (variants || []).filter((variant) => variant.catalog_module_id === module.id).map((variant) => ({ id: variant.id, mechanism: variant.mechanism }))
      }))
    }))
  };
}

export default async function OrdersPage({ searchParams }) {
  const params = (await searchParams) || {};
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name, role, active').eq('id', userId).single();
  if (!profile?.active) redirect('/login?error=Usuario%20sin%20acceso%20activo.');

  const canCreate = ['representante', 'admin'].includes(profile.role);
  const canManage = ['pedidos', 'admin'].includes(profile.role);
  const catalog = canCreate ? await publishedCatalog(supabase) : null;
  const { data: orders } = await supabase.from('orders').select('id, order_number, client_code, client_name, order_date, model_name, status, created_at, order_lines(quantity)').order('created_at', { ascending: false });
  const error = messageFrom(params.error);
  const message = messageFrom(params.message);

  return (
    <main className="orders-page">
      <header className="orders-header"><div><p className="eyebrow">PEDIDOS</p><h1>Gestión de pedidos</h1><p>{profile.full_name || 'Usuario'} · {roleLabels[profile.role] || profile.role}</p></div><Link className="secondary-button orders-back" href="/dashboard">Volver al panel</Link></header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="catalog-success" role="status">{message}</p> : null}

      {canCreate ? <section className="orders-panel"><p className="eyebrow">NUEVO PEDIDO</p><h2>Crear pedido</h2>{catalog?.models?.length ? <NewOrderForm models={catalog.models} action={createOrder} /> : <p className="auth-intro">No hay un catálogo publicado disponible para crear pedidos.</p>}</section> : null}

      <section className="orders-panel">
        <div className="orders-list-heading"><div><p className="eyebrow">{canManage ? 'BANDEJA OPERATIVA' : 'MIS PEDIDOS'}</p><h2>{canManage ? 'Todos los pedidos' : 'Pedidos enviados'}</h2></div><span className="orders-count">{(orders || []).length}</span></div>
        <div className="orders-list">
          {(orders || []).map((order) => {
            const quantity = (order.order_lines || []).reduce((sum, line) => sum + line.quantity, 0);
            const nextStatus = order.status === 'pendiente' ? 'confirmado' : order.status === 'confirmado' ? 'en_fabricacion' : null;
            return <article className="order-row" key={order.id}><div><strong>Pedido #{order.order_number}</strong><p>{order.client_name} · {order.client_code}</p><small>{order.model_name} · {quantity} unidades · {formatDate(order.order_date)}</small><small>Registrado: {formatCreatedAt(order.created_at)}</small></div><div className="order-row-actions"><span className={`order-status status-${order.status}`}>{statusLabels[order.status] || order.status}</span>{canManage && nextStatus ? <form action={advanceOrderStatus}><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="status" value={nextStatus} /><button type="submit" className="secondary-button">{nextStatus === 'confirmado' ? 'Confirmar' : 'Enviar a fabricación'}</button></form> : null}</div></article>;
          })}
          {!orders?.length ? <p className="auth-intro">Todavía no hay pedidos registrados.</p> : null}
        </div>
      </section>
    </main>
  );
}
