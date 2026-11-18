const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

test('an in-flight save cannot acknowledge newer unsaved edits', async () => {
  const source = readFileSync('app/pedidos/new-order-form.js', 'utf8');
  const fragment = source.match(/function markDraftChanged\(\) \{[\s\S]*?\n  const compositionByModel/);
  assert.ok(fragment);

  let release;
  let status = '';
  const payloads = [];
  const context = {
    draftAction: (request) => {
      payloads.push(JSON.parse(JSON.stringify(request.payload)));
      return new Promise((resolve) => {
        release = () => resolve({ id: request.draftId });
      });
    },
    draftId: '123e4567-e89b-42d3-a456-426614174000',
    catalogVersionId: 'catalog',
    customerId: 'customer',
    orderDate: '2026-11-18',
    notes: 'old',
    modelId: 'model',
    fabricIdsByModel: {},
    requestedLines: [],
    crypto: { randomUUID: () => 'new-id' },
    draftRevisionRef: { current: 0 },
    setDraftMessage: (message) => { status = message; },
    setDraftId: (id) => { context.draftId = id; },
    startDraftSave: (fn) => { context.pending = fn(); }
  };
  const handlers = vm.runInNewContext(
    `${fragment[0].replace(/\n  const compositionByModel$/, '')}; ({ markDraftChanged, saveDraft })`,
    context
  );

  handlers.saveDraft();
  context.notes = 'latest unsaved edit';
  handlers.markDraftChanged();
  assert.equal(status, 'Cambios sin guardar.');

  release();
  await context.pending;
  assert.equal(payloads[0].notes, 'old');
  assert.equal(status, 'Cambios sin guardar.');
});
