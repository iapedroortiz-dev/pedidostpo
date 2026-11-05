const assert = require('node:assert/strict');
const { test } = require('node:test');
const { catalogFabricCountsForVersions } = require('../lib/catalog-counts');

function createSupabase({ counts = {}, errorFor = null } = {}) {
  return {
    from(table) {
      assert.equal(table, 'catalog_fabrics');
      return {
        select(columns, options) {
          assert.equal(columns, 'id');
          assert.deepEqual(options, { count: 'exact', head: true });
          return {
            eq(column, versionId) {
              assert.equal(column, 'catalog_version_id');
              return Promise.resolve({
                count: counts[versionId] || 0,
                error: versionId === errorFor ? new Error('query failed') : null,
              });
            },
          };
        },
      };
    },
  };
}

test('counts every fabric in each catalog version without loading paginated rows', async () => {
  const counts = await catalogFabricCountsForVersions(
    createSupabase({ counts: { draft: 3925, published: 1000 } }),
    ['draft', 'published']
  );

  assert.deepEqual([...counts], [['draft', 3925], ['published', 1000]]);
});

test('does not hide catalog-fabric query failures as zero', async () => {
  await assert.rejects(
    catalogFabricCountsForVersions(createSupabase({ errorFor: 'draft' }), ['draft']),
    /query failed/
  );
});
