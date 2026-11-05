const { activeCatalogWorkbookData } = require('./catalog-workbook');

class CatalogDownloadError extends Error {
  constructor(message, status = 500) { super(message); this.status = status; }
}

function exportFilename(label, date = new Date()) {
  const name = String(label || 'catalogo-activo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'catalogo-activo';
  const timestamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-');
  return `catalogo-activo-${name}-${timestamp}.xlsx`;
}

async function requireActiveAdmin(supabase) {
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new CatalogDownloadError('Inicia sesión para descargar el Excel.', 401);
  const { data: profile, error } = await supabase.from('profiles').select('role, active').eq('id', userId).single();
  if (error || !profile?.active || profile.role !== 'admin') throw new CatalogDownloadError('No tienes permiso para descargar el Excel.', 403);
}

async function allRows(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw new CatalogDownloadError('No se pudieron obtener los datos del catálogo.');
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function activeCatalogWorkbookFor(supabase) {
  const { data: version, error: versionError } = await supabase.from('catalog_versions').select('id, label').eq('status', 'publicado').maybeSingle();
  if (versionError) throw new CatalogDownloadError('No se pudo obtener el catálogo publicado.');
  if (!version) throw new CatalogDownloadError('No hay un catálogo publicado para exportar.', 404);
  const models = await allRows(() => supabase.from('catalog_models').select('id, display_order').eq('catalog_version_id', version.id).order('display_order'));
  if (!models.length) throw new CatalogDownloadError('El catálogo publicado no contiene modelos compatibles para exportar.', 409);
  const items = [];
  for (let start = 0; start < models.length; start += 100) {
    const modelIds = models.slice(start, start + 100).map((model) => model.id);
    items.push(...await allRows(() => supabase.from('catalog_items').select('catalog_model_id, code, description, category_option, side_option, display_order').in('catalog_model_id', modelIds).order('catalog_model_id').order('display_order')));
  }
  if (!items.length) throw new CatalogDownloadError('El catálogo publicado es una versión anterior sin elementos que se puedan exportar.', 409);
  const modelOrder = new Map(models.map((model, index) => [model.id, model.display_order ?? index]));
  items.sort((first, second) => (modelOrder.get(first.catalog_model_id) - modelOrder.get(second.catalog_model_id)) || ((first.display_order || 0) - (second.display_order || 0)));
  const fabrics = await allRows(() => supabase.from('catalog_fabrics').select('code, name, fabric_type, display_order').eq('catalog_version_id', version.id).order('display_order'));
  const customers = await allRows(() => supabase.from('customers').select('client_code, trade_name, representative_id').eq('active', true).order('client_code'));
  const ids = [...new Set(customers.map((customer) => customer.representative_id).filter(Boolean))];
  const emails = new Map();
  for (let start = 0; start < ids.length; start += 100) {
    const { data: profiles, error } = await supabase.from('profiles').select('id, email').in('id', ids.slice(start, start + 100));
    if (error) throw new CatalogDownloadError('No se pudieron obtener las asignaciones de clientes.');
    (profiles || []).forEach((profile) => emails.set(profile.id, profile.email));
  }
  try {
    return activeCatalogWorkbookData({ label: version.label, items: items.map((item) => ({ code: item.code, description: item.description, categoryOption: item.category_option, sideOption: item.side_option })), customers: customers.map((customer) => ({ clientCode: customer.client_code, tradeName: customer.trade_name, representativeId: customer.representative_id, representativeEmail: customer.representative_id ? emails.get(customer.representative_id) : null })), fabrics: fabrics.map((fabric) => ({ code: fabric.code, name: fabric.name, fabricType: fabric.fabric_type })) });
  } catch (error) { throw new CatalogDownloadError(error.message, 409); }
}

module.exports = { CatalogDownloadError, activeCatalogWorkbookFor, exportFilename, requireActiveAdmin };
