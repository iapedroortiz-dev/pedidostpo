const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('allows only pending own orders to replace their lines and fabric assignments', () => {
  const sql = readFileSync('supabase/migrations/20261106100000_allow_pending_order_edits.sql', 'utf8');

  assert.match(sql, /grant delete on public\.order_lines to authenticated/);
  assert.match(sql, /create policy order_lines_delete_own_pending_or_admin/);
  assert.match(sql, /grant delete on public\.order_model_fabrics to authenticated/);
  assert.match(sql, /create policy order_model_fabrics_delete_own_pending_or_admin/);
  assert.match(sql, /o\.status = 'pendiente'::public\.order_status/);
});

test('updates an order and dependent records through one transactional RPC', () => {
  const actions = readFileSync('app/pedidos/actions.js', 'utf8');
  const updateAction = actions.split('export async function updateOrder')[1];
  const sql = readFileSync('supabase/migrations/20261106100000_allow_pending_order_edits.sql', 'utf8');

  assert.ok(updateAction);
  assert.match(updateAction, /rpc\('replace_pending_order'/);
  assert.match(sql, /create or replace function public\.replace_pending_order/);
  assert.match(sql, /delete from public\.order_model_fabrics/);
  assert.match(sql, /delete from public\.order_lines/);
});

test('loads the edited order catalogue version instead of the current published catalogue', () => {
  const page = readFileSync('app/pedidos/page.js', 'utf8');

  assert.match(page, /catalogForVersion\(createAdminClient\(\), editableOrder\.catalog_version_id\)/);
});
