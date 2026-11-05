const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const migrations = process.env.MIGRATIONS_DIR || join(__dirname, '..', 'supabase', 'migrations');
const addEnum = readFileSync(join(migrations, '20261009110000_simplify_order_statuses.sql'), 'utf8');
const finalize = readFileSync(join(migrations, '20261009110001_finalize_order_status_simplification.sql'), 'utf8');

test('adds the enum value in an isolated migration', () => {
  assert.match(addEnum, /^alter type public\.order_status add value if not exists 'gestionado';\s*$/);
});

test('updates legacy statuses only after the enum migration', () => {
  assert.match(finalize, /^update public\.orders\s+set status = 'gestionado'\s+where status in \('confirmado', 'en_fabricacion', 'servido'\);/);
});

test('preserves the managed-order authorization and transition', () => {
  assert.match(finalize, /v_role not in \('admin'::public\.app_role, 'pedidos'::public\.app_role\)/);
  assert.match(finalize, /if not \(v_current_status = 'pendiente' and p_new_status = 'gestionado'\) then/);
});
