const assert = require('node:assert/strict');
const { test } = require('node:test');
const { matchingFabrics } = require('../lib/fabric-search');

test('returns every matching fabric instead of truncating the result list', () => {
  const fabrics = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    code: `ABC-${index + 1}`,
    name: `Tejido Ábaco ${index + 1}`,
  }));

  assert.equal(matchingFabrics(fabrics, 'abc').length, 12);
  assert.equal(matchingFabrics(fabrics, 'abaco').length, 12);
});

test('requires a search term before returning fabric results', () => {
  assert.deepEqual(matchingFabrics([{ id: '1', code: 'ABC', name: 'Ábaco' }], '  '), []);
});
