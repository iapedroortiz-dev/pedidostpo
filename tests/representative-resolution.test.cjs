const assert = require('node:assert/strict');
const { test } = require('node:test');
const { representativeIdsByEmail } = require('../lib/representative-resolution');

test('Representative resolution is case-insensitive and preserves normalized email keys', async () => {
  const calls = [];
  const admin = {
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select() { return this; },
        ilike(column, email) { calls.push([column, email]); return this; },
        async maybeSingle() { return { data: { id: 'rep-1', email: 'Rep@Example.com' }, error: null }; },
      };
    },
  };
  const resolved = await representativeIdsByEmail(admin, ['rep@example.com']);
  assert.deepEqual(calls, [['email', 'rep@example.com']]);
  assert.equal(resolved.get('rep@example.com'), 'rep-1');
});

test('Representative resolution fails when an email cannot be matched', async () => {
  const admin = {
    from() { return { select() { return this; }, ilike() { return this; }, async maybeSingle() { return { data: null, error: null }; } }; },
  };
  await assert.rejects(representativeIdsByEmail(admin, ['missing@example.com']), /No existe un usuario para: missing@example.com/);
});
