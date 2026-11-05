const assert = require('node:assert/strict');
const { test } = require('node:test');
const JSZip = require('jszip');
const { catalogAndCustomersFromBuffer } = require('../lib/catalog');
const {
  EXCEL_MIME,
  activeCatalogWorkbookData,
  templateWorkbookData,
  workbookBuffer,
} = require('../lib/catalog-workbook');

test('The template has exact import headers and parses through the existing importer', async () => {
  const data = templateWorkbookData();
  assert.deepEqual(data.sheets.map((sheet) => sheet.name), ['INSTRUCCIONES', 'PRODUCTOS', 'CLIENTES', 'TEJIDOS']);
  assert.deepEqual(data.sheets[1].rows[0], ['Cod.', 'Descripción', 'Tipo', 'Opción']);
  assert.deepEqual(data.sheets[2].rows[0], ['Cod.', 'Nombre Comercial', 'Representante']);
  assert.deepEqual(data.sheets[3].rows[0], ['COD_TAPIZADO', 'NOMBRE_TAPIZADO', 'TIPO_TAPIZADO']);

  const parsed = await catalogAndCustomersFromBuffer(await workbookBuffer(data), 'plantilla.xlsx');
  assert.equal(parsed.models[0].items[0].code, 'EJ-P001');
  assert.equal(parsed.customers[0].representativeEmail, null);
  assert.deepEqual(parsed.fabrics[0], { code: 'EJ-T001', name: 'Tela de ejemplo', fabricType: 'T' });
});

test('The published catalog export round-trips preserved import fields and text values', async () => {
  const data = activeCatalogWorkbookData({
    label: 'Tarifa & <actual>',
    items: [
      { code: '0007', description: 'Aurora & <modulo>', categoryOption: 'Relax', sideOption: 'izquierda', displayOrder: 2 },
      { code: '0008', description: 'Aurora modulo fijo', categoryOption: null, sideOption: null, displayOrder: 3 },
    ],
    customers: [
      { clientCode: '0001', tradeName: 'Cliente & <actual>', representativeEmail: 'representante@example.com' },
      { clientCode: '0002', tradeName: 'Sin asignar', representativeEmail: null },
    ],
    fabrics: [
      { code: '0003', name: 'Piel & <roble>', fabricType: 'P', displayOrder: 1 },
      { code: '0004', name: 'Tela azul', fabricType: 'T', displayOrder: 2 },
    ],
  });

  const buffer = await workbookBuffer(data);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  const parsed = await catalogAndCustomersFromBuffer(buffer, 'catalogo.xlsx');
  assert.deepEqual(parsed.models[0].items.map((item) => [item.code, item.description, item.categoryOption, item.sideOption]), [
    ['0007', 'Aurora & <modulo>', 'Relax', 'izquierda'],
    ['0008', 'Aurora modulo fijo', null, null],
  ]);
  assert.deepEqual(parsed.customers, [
    { clientCode: '0001', tradeName: 'Cliente & <actual>', representativeEmail: 'representante@example.com' },
    { clientCode: '0002', tradeName: 'Sin asignar', representativeEmail: null },
  ]);
  assert.deepEqual(parsed.fabrics, [
    { code: '0003', name: 'Piel & <roble>', fabricType: 'P' },
    { code: '0004', name: 'Tela azul', fabricType: 'T' },
  ]);
});

test('Workbook writer stores all cells as text and rejects unsupported values', async () => {
  const data = {
    sheets: [{ name: 'PRODUCTOS', rows: [['Cod.', 'Descripción', 'Tipo', 'Opción'], ['=NOT-A-FORMULA', 'Aurora texto', '', '']] }],
  };
  const buffer = await workbookBuffer(data);
  const zip = await JSZip.loadAsync(buffer);
  const sheet = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet, /inlineStr/);
  assert.doesNotMatch(sheet, /<f>/);
  await assert.rejects(workbookBuffer({ sheets: [] }), /al menos una hoja/);
  await assert.rejects(workbookBuffer({ sheets: [{ name: 'PRODUCTOS', rows: [] }] }), /una fila/);
  assert.equal(EXCEL_MIME, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('Published export refuses missing required import datasets and unresolved assignments', () => {
  const base = { label: 'Activa', items: [{ code: 'P-1', description: 'Aurora demo' }], customers: [{ clientCode: 'C-1', tradeName: 'Cliente', representativeEmail: null }], fabrics: [{ code: 'T-1', name: 'Tela', fabricType: 'T' }] };
  assert.throws(() => activeCatalogWorkbookData({ ...base, items: [] }), /elementos/);
  assert.throws(() => activeCatalogWorkbookData({ ...base, customers: [] }), /clientes activos/);
  assert.throws(() => activeCatalogWorkbookData({ ...base, fabrics: [] }), /tejidos/);
  assert.throws(() => activeCatalogWorkbookData({ ...base, customers: [{ clientCode: 'C-1', tradeName: 'Cliente', representativeId: 'missing', representativeEmail: null }] }), /asignación/);
});
