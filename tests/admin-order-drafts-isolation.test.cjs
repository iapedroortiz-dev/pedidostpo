const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('every order-draft operation requires its active owner', () => {
  const sql = read('supabase/migrations/20261118120000_allow_admin_order_drafts.sql');
  const role = read('supabase/migrations/20260727102151_initial_schema.sql');

  for (const operation of ['select', 'insert', 'update', 'delete']) {
    const body = sql.match(new RegExp(
      `create policy order_drafts_${operation}_own\\s+on public\\.order_drafts\\s+for ${operation}\\s+to authenticated\\s+([\\s\\S]*?);`,
      'i'
    ))?.[1];
    assert.ok(body, `${operation} policy exists`);
    const count = operation === 'update' ? 2 : 1;
    assert.equal((body.match(/representative_id\s*=\s*\(select auth\.uid\(\)\)/g) || []).length, count);
    assert.equal((body.match(/\(select public\.current_app_role\(\)\) in \('representante'::public\.app_role, 'admin'::public\.app_role\)/g) || []).length, count);
  }

  assert.match(role, /where id = \(select auth\.uid\(\)\)\s+and active = true/);
});

test('administrators receive the draft control and submit only owned drafts', () => {
  const page = read('app/pedidos/page.js');
  const save = read('app/pedidos/draft-actions.js');
  const submit = read('app/pedidos/actions.js');

  assert.match(page, /canUseDrafts = \['representante', 'admin'\]/);
  assert.match(page, /draftAction=\{canUseDrafts \? saveOrderDraft : null\}/);
  assert.match(save, /representative_id: userId/);
  assert.match(submit, /draftId && \['representante', 'admin'\]\.includes\(profile\.role\)/);
  assert.match(submit, /\.eq\('representative_id', userId\)/);
});
