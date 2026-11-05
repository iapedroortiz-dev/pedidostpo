const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('owned-order fabric inserts verify the model snapshot and order state', () => {
  const sql = readFileSync('supabase/migrations/20261105110000_add_order_model_fabrics.sql', 'utf8');
  const policy = sql.split('create policy order_model_fabrics_insert_own_or_admin')[1].split('create trigger')[0];

  assert.match(policy, /catalog_models\.name\s*=\s*order_model_fabrics\.model_name/);
  assert.match(policy, /orders\.status\s*=\s*'pendiente'/);
});
