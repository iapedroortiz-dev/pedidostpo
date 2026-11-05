const assert = require('node:assert/strict');
const { test } = require('node:test');
const { bedDiagramType, isChaiselongueModule } = require('../lib/module-diagram');

test('uses the bed-with-arm diagram for CAMA C/B elements', () => {
  assert.equal(bedDiagramType(['CAMA C/B']), 'bed-arm');
  assert.equal(bedDiagramType(['Cama c / b izquierda']), 'bed-arm');
});

test('uses the bed diagram for CAMA elements without C/B', () => {
  assert.equal(bedDiagramType(['CAMA']), 'bed');
  assert.equal(bedDiagramType(['Cama abatible']), 'bed');
  assert.equal(bedDiagramType(['Sofá fijo']), null);
});

test('recognizes CHLONG as a chaiselongue module', () => {
  assert.equal(isChaiselongueModule(['CHLONG C/B D']), true);
  assert.equal(isChaiselongueModule(['Chaiselongue izquierda']), true);
  assert.equal(isChaiselongueModule(['CAMA']), false);
});
