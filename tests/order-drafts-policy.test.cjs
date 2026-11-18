const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

const migrationPath = 'supabase/migrations/20261118110000_add_private_order_drafts.sql';

test('order drafts are private to their representative', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /create table public\.order_drafts/i);
  assert.match(sql, /alter table public\.order_drafts enable row level security/i);
  assert.match(sql, /create policy order_drafts_select_own/i);
  assert.match(sql, /representative_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /order_drafts_select_own[\s\S]*?current_app_role\(\).*representante/i);
  assert.match(sql, /create policy order_drafts_insert_own/i);
  assert.match(sql, /create policy order_drafts_update_own/i);
  assert.match(sql, /create policy order_drafts_delete_own/i);
});

test('drafts keep a compact payload instead of creating an operational order', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /payload jsonb not null default '\{\}'::jsonb/);
  assert.doesNotMatch(sql, /insert into public\.orders/i);
});

test('only representatives can persist a draft payload', () => {
  const actions = readFileSync('app/pedidos/draft-actions.js', 'utf8');

  assert.match(actions, /profile\.role !== 'representante'/);
  assert.match(actions, /from\('order_drafts'\)/);
  assert.match(actions, /\.upsert\(/);
  assert.match(actions, /eq\('status', 'publicado'\)/);
  assert.match(actions, /payload: safeDraftPayload\(payload\)/);
});

test('sending a draft removes it after the operational order is created', () => {
  const actions = readFileSync('app/pedidos/actions.js', 'utf8');
  const createAction = actions.split('export async function createOrder')[1];

  assert.ok(createAction);
  assert.match(createAction, /from\('order_drafts'\)\s+\.delete\(\)/);
  assert.doesNotMatch(createAction, /if \(draftId && !draft\)/);
});

test('representative forms autosave data but not attachments', () => {
  const form = readFileSync('app/pedidos/new-order-form.js', 'utf8');

  assert.match(form, /setTimeout\(/);
  assert.match(form, /draftAction\(\{ draftId, catalogVersionId, payload \}\)/);
  assert.match(form, /Los adjuntos se cargarán únicamente al enviar el pedido\./);
});

test('only representative pages load and resume private drafts', () => {
  const page = readFileSync('app/pedidos/page.js', 'utf8');

  assert.match(page, /profile\.role === 'representante'/);
  assert.match(page, /from\('order_drafts'\)/);
  assert.match(page, /Continuar borrador/);
  assert.match(page, /draftAction=\{profile\.role === 'representante' \? saveOrderDraft : null\}/);
});

test('unpersisted draft ID reaches ordinary order validation', async () => {
  const source = readFileSync('app/pedidos/actions.js', 'utf8');
  const body = source.split('export async function createOrder(formData) {')[1]
    .split('export async function updateOrder(')[0];
  const createOrder = new Function(
    'createClient', 'currentUserProfile', 'redirectWithError',
    `return (async function createOrder(formData) {${body.trim()})`
  )(
    async () => ({
      from(table) {
        assert.equal(table, 'order_drafts');
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() { return { data: null }; }
        };
      }
    }),
    async () => ({ userId: 'owner', profile: { role: 'representante' } }),
    (message) => { throw new Error(message); }
  );
  const form = new Map([['draftId', '123e4567-e89b-42d3-a456-426614174000']]);

  await assert.rejects(createOrder(form), { message: 'Completa el cliente y la fecha del pedido.' });
});

test('draft SELECT requires owner and active representative role', () => {
  const sql = readFileSync(migrationPath, 'utf8');
  const policy = sql.split('create policy order_drafts_select_own')[1]
    .split('create policy order_drafts_insert_own')[0];
  const roles = readFileSync('supabase/migrations/20260727102151_initial_schema.sql', 'utf8');

  assert.match(policy, /representative_id\s*=\s*\(select auth\.uid\(\)\)/);
  assert.match(policy, /current_app_role\(\).*representante/s);
  assert.match(roles, /create or replace function public\.current_app_role\(\)[\s\S]*?active\s*=\s*true[\s\S]*?\$\$/);
});

test('leaving the form flushes a pending draft and explains where to resume it', () => {
  const form = readFileSync('app/pedidos/new-order-form.js', 'utf8');

  assert.match(form, /pendingDraftRef\.current = \{ draftId, catalogVersionId, payload \}/);
  assert.match(form, /void draftAction\(pendingDraft\)\.catch\(\(\) => \{\}\)/);
  assert.match(form, /Al volver a Pedidos, puedes continuar el borrador desde Mis borradores\./);
});

test('submitting the order prevents the unmount cleanup from recreating its draft', () => {
  const form = readFileSync('app/pedidos/new-order-form.js', 'utf8');

  assert.match(form, /<form action=\{action\} onSubmit=\{\(\) => \{ pendingDraftRef\.current = null; \}\} className="order-form">/);
});

test('submitted drafts stay deleted while ordinary navigation flushes the latest payload', () => {
  const form = readFileSync('app/pedidos/new-order-form.js', 'utf8');
  const submit = form.match(/<form action=\{action\} onSubmit=\{\(\) => \{([^}]*)\}\}/);
  const cleanup = form.match(/useEffect\(\(\) => \(\) => \{([\s\S]*?)\}, \[draftAction\]\);/);
  assert.ok(submit && cleanup);

  const onSubmit = new Function('pendingDraftRef', submit[1]);
  const unmount = new Function('pendingDraftRef', 'draftAction', cleanup[1]);
  const latest = { draftId: 'draft-1', payload: { notes: 'latest' } };
  const saved = [];
  const save = (draft) => { saved.push(draft); return Promise.resolve(); };

  unmount({ current: latest }, save);
  assert.deepEqual(saved, [latest]);

  saved.length = 0;
  const submitted = { current: latest };
  onSubmit(submitted);
  unmount(submitted, save);
  assert.equal(saved.length, 0);
});
