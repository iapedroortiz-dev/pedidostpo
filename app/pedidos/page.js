import Link from 'next/link';
import { redirect } from 'next/navigation';
import { advanceOrderStatus, createOrder } from './actions';
import NewOrderForm from './new-order-form';
import { createClient } from '../../lib/supabase/server';

const roleLabels = {
  admin: 'Administrador',
  pedidos: 'Departamento de pedidos',
  representante: 'Representante'
};
const statusLabels = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_fabricacion: 'En fabricacion'
};

function messageFrom(value) {
  return typeof value === 'string' ? value : '';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(
    new Date(`${value}T12:00:00`)
  );
}

function formatCreatedAt(value) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function catalogItemsForModels(supabase, modelIds) {
  const items = [];
  const pageSize = 1000;

  for (let start = 0; start < modelIds.length; start += 100) {
    const modelIdBatch = modelIds.slice(start, start + 100);

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('id, catalog_model_id, code, description, category_option, side_option, display_order')
        .in('catalog_model_id', modelIdBatch)
        .order('catalog_model_id')
        .order('display_order')
        .range(from, from + pageSize - 1);
      if (error) throw error;

      items.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
  }

  return items;
}

async function publishedCatalog(supabase) {
  const { data: version } = await supabase
    .from('catalog_versions')
    .select('id, label')
    .eq('status', 'publicado')
    .maybeSingle();
  if (!version) return null;

  const { data: models } = await supabase
    .from('catalog_models')
    .select('id, name, display_order')
    .eq('catalog_version_id', version.id)
    .order('display_order');
  const { data: fabrics } = await supabase
    .from('catalog_fabrics')
    .select('id, code, name, fabric_type, display_order')
    .eq('catalog_version_id', version.id)
    .order('display_order');
  const modelIds = (models || []).map((model) => model.id);
  const mappedFabrics = (fabrics || []).map((fabric) => ({
    id: fabric.id,
    code: fabric.code,
    name: fabric.name,
    type: fabric.fabric_type
  }));
  if (!modelIds.length) return { ...version, format: 'items', models: [], fabrics: mappedFabrics };

  const items = await catalogItemsForModels(supabase, modelIds);

  if (items.length) {
    return {
      ...version,
      format: 'items',
      fabrics: mappedFabrics,
      models: (models || []).map((model) => ({
        id: model.id,
        name: model.name,
        items: items
          .filter((item) => item.catalog_model_id === model.id)
          .map((item) => ({
            id: item.id,
            code: item.code,
            description: item.description,
            categoryOption: item.category_option,
            sideOption: item.side_option
          }))
      }))
    };
  }

  const { data: modules } = await supabase
    .from('catalog_modules')
    .select('id, catalog_model_id, name, needs_side, display_order')
    .in('catalog_model_id', modelIds)
    .order('display_order');
  const moduleIds = (modules || []).map((module) => module.id);
  const { data: variants } = moduleIds.length
    ? await supabase
        .from('catalog_module_variants')
        .select('id, catalog_module_id, mechanism, display_order')
        .in('catalog_module_id', moduleIds)
        .order('display_order')
    : { data: [] };

  return {
    ...version,
    format: 'legacy',
    fabrics: mappedFabrics,
    models: (models || []).map((model) => ({
      id: model.id,
      name: model.name,
      modules: (modules || [])
        .filter((module) => module.catalog_model_id === model.id)
        .map((module) => ({
          id: module.id,
          name: module.name,
          needsSide: module.needs_side,
          variants: (variants || [])
            .filter((variant) => variant.catalog_module_id === module.id)
            .map((variant) => ({ id: variant.id, mechanism: variant.mechanism }))
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, active')
    .eq('id', userId)
    .single();
  if (!profile?.active) redirect('/login?error=Usuario%20sin%20acceso%20activo.');

  const canCreate = ['representante', 'admin'].includes(profile.role);
  const canManage = ['pedidos', 'admin'].includes(profile.role);
  const catalog = canCreate ? await publishedCatalog(supabase) : null;
  const { data: customers } = canCreate
    ? await supabase
        .from('customers')
        .select('id, client_code, trade_name')
        .eq('active', true)
        .order('trade_name')
    : { data: [] };
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, client_code, client_name, order_date, model_name, fabric_code, fabric_name, fabric_type, status, created_at, order_lines(quantity)')
    .order('created_at', { ascending: false });
  const error = messageFrom(params.error);
  const message = messageFrom(params.message);

  return (
    <main className="orders-page">
      <header className="orders-header">
        <div>
          <p className="eyebrow">PEDIDOS</p>
          <h1>Gestion de pedidos</h1>
          <p>{profile.full_name || 'Usuario'} - {roleLabels[profile.role] || profile.role}</p>
        </div>
        <Link className="secondary-button orders-back" href="/dashboard">Volver al panel</Link>
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="catalog-success" role="status">{message}</p> : null}

      {canCreate ? <section className="orders-panel"><p className="eyebrow">NUEVO PEDIDO</p><h2>Crear pedido</h2>{catalog?.models?.length && catalog?.fabrics?.length && customers?.length ? <NewOrderForm models={catalog.models} fabrics={catalog.fabrics} customers={customers} catalogFormat={catalog.format} action={createOrder} /> : <p className="auth-intro">{catalog?.models?.length ? catalog?.fabrics?.length ? 'No hay clientes asignados disponibles para crear pedidos.' : 'El catálogo publicado no incluye tejidos. Importa una nueva versión con la hoja TEJIDOS.' : 'No hay un catalogo publicado disponible para crear pedidos.'}</p>}</section> : null}

      <section className="orders-panel">
        <div className="orders-list-heading"><div><p className="eyebrow">{canManage ? 'BANDEJA OPERATIVA' : 'MIS PEDIDOS'}</p><h2>{canManage ? 'Todos los pedidos' : 'Pedidos enviados'}</h2></div><span className="orders-count">{(orders || []).length}</span></div>
        <div className="orders-list">
          {(orders || []).map((order) => {
            const quantity = (order.order_lines || []).reduce((sum, line) => sum + line.quantity, 0);
            const nextStatus = order.status === 'pendiente' ? 'confirmado' : order.status === 'confirmado' ? 'en_fabricacion' : null;
            return <article className="order-row" key={order.id}><div><strong>Pedido #{order.order_number}</strong><p>{order.client_name} - {order.client_code}</p><small>{order.model_name} - {quantity} unidades - {formatDate(order.order_date)}</small>{order.fabric_name ? <small>Tejido: {order.fabric_code} - {order.fabric_name} ({order.fabric_type === 'P' ? 'Piel' : 'Tela'})</small> : null}<small>Registrado: {formatCreatedAt(order.created_at)}</small></div><div className="order-row-actions"><span className={`order-status status-${order.status}`}>{statusLabels[order.status] || order.status}</span>{canManage && nextStatus ? <form action={advanceOrderStatus}><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="status" value={nextStatus} /><button type="submit" className="secondary-button">{nextStatus === 'confirmado' ? 'Confirmar' : 'Enviar a fabricacion'}</button></form> : null}</div></article>;
          })}
          {!orders?.length ? <p className="auth-intro">Todavia no hay pedidos registrados.</p> : null}
        </div>
      </section>
    </main>
  );
}
