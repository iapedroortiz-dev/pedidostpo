const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CatalogDownloadError, activeCatalogWorkbookFor, exportFilename, requireActiveAdmin } = require('../lib/catalog-export');

function createSupabase({ userId = 'admin-id', profile = { role: 'admin', active: true }, tables = {}, failures = {} } = {}) {
  return {
    auth: { async getClaims() { return { data: { claims: userId ? { sub: userId } : null } }; } },
    from(table) {
      const query = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        range() { return Promise.resolve({ data: tables[table] || [], error: failures[table] || null }); },
        maybeSingle() { return Promise.resolve({ data: tables[table] ?? null, error: failures[table] || null }); },
        single() { return Promise.resolve({ data: table === 'profiles' ? profile : tables[table] ?? null, error: failures[table] || null }); },
        then(resolve, reject) { return Promise.resolve({ data: tables[table] || [], error: failures[table] || null }).then(resolve, reject); },
      };
      return query;
    },
  };
}

test('Catalog downloads require an authenticated active administrator', async () => {
  await assert.rejects(requireActiveAdmin(createSupabase({ userId: null })), (error) => error instanceof CatalogDownloadError && error.status === 401);
  await assert.rejects(requireActiveAdmin(createSupabase({ profile: { role: 'pedidos', active: true } })), (error) => error instanceof CatalogDownloadError && error.status === 403);
  await assert.rejects(requireActiveAdmin(createSupabase({ profile: { role: 'admin', active: false } })), (error) => error instanceof CatalogDownloadError && error.status === 403);
  await assert.doesNotReject(requireActiveAdmin(createSupabase()));
});

test('Published export maps active current customers and refuses incomplete source data', async () => {
  const workbook = await activeCatalogWorkbookFor(createSupabase({ tables: {
    catalog_versions: { id: 'v1', label: 'Tarifa actual' },
    catalog_models: [{ id: 'm1', display_order: 1 }],
    catalog_items: [{ catalog_model_id: 'm1', code: '001', description: 'Aurora módulo', category_option: 'Relax', side_option: 'izquierda', display_order: 1 }],
    catalog_fabrics: [{ code: 'T-1', name: 'Tela', fabric_type: 'T', display_order: 1 }],
    customers: [{ client_code: 'C-1', trade_name: 'Cliente', representative_id: 'rep-1' }],
    profiles: [{ id: 'rep-1', email: 'rep@example.com' }],
  } }));
  assert.deepEqual(workbook.sheets[0].rows[1], ['001', 'Aurora módulo', 'Relax', 'izquierda']);
  assert.deepEqual(workbook.sheets[1].rows[1], ['C-1', 'Cliente', 'rep@example.com']);

  await assert.rejects(activeCatalogWorkbookFor(createSupabase({ tables: { catalog_versions: null } })), (error) => error.status === 404);
  await assert.rejects(activeCatalogWorkbookFor(createSupabase({ tables: {
    catalog_versions: { id: 'v1', label: 'Tarifa' }, catalog_models: [{ id: 'm1' }], catalog_items: [{ code: 'P-1', description: 'Aurora demo' }], catalog_fabrics: [{ code: 'T-1', name: 'Tela', fabric_type: 'T' }], customers: [{ client_code: 'C-1', trade_name: 'Cliente', representative_id: 'missing' }], profiles: [],
  } })), (error) => error.status === 409 && /asignación/.test(error.message));
});

test('Export filename cannot default to the existing published version label', () => {
  assert.equal(exportFilename('Tarifa actual', new Date('2026-10-22T09:30:45Z')), 'catalogo-activo-Tarifa-actual-20261022-093045.xlsx');
  assert.notEqual(exportFilename('Tarifa actual', new Date('2026-10-22T09:30:45Z')), 'Tarifa-actual.xlsx');
});
