const assert = require('node:assert/strict');
const { test } = require('node:test');
const { catalogFabricsForVersion } = require('../lib/catalog-fabrics');

test('loads every fabric page for a catalog version', async () => {
  const ranges = [];
  const pages = [
    Array.from({ length: 1000 }, (_, index) => ({ id: String(index) })),
    Array.from({ length: 1000 }, (_, index) => ({ id: String(index + 1000) })),
    [{ id: '2000' }],
  ];
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        range(from, to) {
          ranges.push([from, to]);
          return Promise.resolve({ data: pages.shift(), error: null });
        },
      };
    },
  };

  const fabrics = await catalogFabricsForVersion(supabase, 'catalog-id');

  assert.equal(fabrics.length, 2001);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
});
