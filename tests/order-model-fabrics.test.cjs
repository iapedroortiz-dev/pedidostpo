const assert = require('node:assert/strict');
const { test } = require('node:test');
const { modelFabricAssignmentsForModels } = require('../lib/order-model-fabrics');

const models = [
  { id: 'model-a', name: 'Modelo A' },
  { id: 'model-b', name: 'Modelo B' },
];

test('assigns a different selected fabric to every order model', () => {
  const assignments = modelFabricAssignmentsForModels(
    models,
    [
      { catalogModelId: 'model-a', catalogFabricId: 'fabric-a' },
      { catalogModelId: 'model-b', catalogFabricId: 'fabric-b' },
    ],
    [
      { id: 'fabric-a', code: 'A', name: 'Arena', fabric_type: 'T' },
      { id: 'fabric-b', code: 'B', name: 'Burdeos', fabric_type: 'P' },
    ],
  );

  assert.deepEqual(assignments, [
    { catalog_model_id: 'model-a', model_name: 'Modelo A', catalog_fabric_id: 'fabric-a', fabric_code: 'A', fabric_name: 'Arena', fabric_type: 'T' },
    { catalog_model_id: 'model-b', model_name: 'Modelo B', catalog_fabric_id: 'fabric-b', fabric_code: 'B', fabric_name: 'Burdeos', fabric_type: 'P' },
  ]);
});

test('allows a model without a catalog fabric and rejects mismatched assignments', () => {
  const assignments = modelFabricAssignmentsForModels(
    models,
    [
      { catalogModelId: 'model-a', catalogFabricId: '' },
      { catalogModelId: 'model-b', catalogFabricId: 'fabric-b' },
    ],
    [{ id: 'fabric-b', code: 'B', name: 'Burdeos', fabric_type: 'P' }],
  );

  assert.equal(assignments[0].catalog_fabric_id, null);
  assert.throws(
    () => modelFabricAssignmentsForModels(models, [{ catalogModelId: 'model-a', catalogFabricId: 'fabric-b' }], []),
    /no son validas/,
  );
});
