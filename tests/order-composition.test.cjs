const assert = require('node:assert/strict');
const { test } = require('node:test');
const { moveCompositionUnit } = require('../lib/order-composition');

test('moves a composition unit before the drop target', () => {
  const order = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(moveCompositionUnit(order, 'c', 'a').map((unit) => unit.id), ['c', 'a', 'b']);
});

test('keeps the composition unchanged for invalid moves', () => {
  const order = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(moveCompositionUnit(order, 'missing', 'b'), order);
  assert.deepEqual(moveCompositionUnit(order, 'a', 'a'), order);
});
