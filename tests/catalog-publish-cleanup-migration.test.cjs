const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const migration = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20261105100000_remove_archived_catalog_elements.sql'),
  'utf8'
);
const initialSchema = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20260727102151_initial_schema.sql'),
  'utf8'
);

test('publishing remembers the previously published catalog before archiving it', () => {
  assert.match(migration, /v_previous_catalog_version_id uuid;/);
  assert.match(migration, /where status = 'publicado'::public\.catalog_status\s+for update;/);
});

test('publishing removes archived items that are absent from the new catalog', () => {
  assert.match(migration, /delete from public\.catalog_items old_item[\s\S]*?old_item\.catalog_model_id = old_model\.id[\s\S]*?new_model\.catalog_version_id = p_catalog_version_id[\s\S]*?new_item\.code = old_item\.code/);
});

test('publishing removes empty archived models after their missing items are removed', () => {
  assert.match(migration, /delete from public\.catalog_models old_model[\s\S]*?not exists \(\s*select 1\s*from public\.catalog_items old_item\s*where old_item\.catalog_model_id = old_model\.id/);
});

test('legacy order references cannot block removal of obsolete models', () => {
  assert.match(initialSchema, /catalog_module_variant_id uuid references public\.catalog_module_variants\(id\) on delete restrict/);
  assert.match(migration, /drop constraint if exists order_lines_catalog_module_variant_id_fkey[\s\S]*?on delete set null/i);
});
