const JSZip = require('jszip');

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function xmlText(value) {
  const text = String(value ?? '');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) throw new Error('El Excel contiene caracteres no compatibles.');
  return text.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cellReference(column, row) {
  let value = column + 1;
  let letters = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return `${letters}${row}`;
}

function worksheetXml(rows) {
  const content = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => value === null || value === undefined || value === '' ? '' : `<c r="${cellReference(columnIndex, rowIndex + 1)}" t="inlineStr"><is><t>${xmlText(value)}</t></is></c>`).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${content}</sheetData></worksheet>`;
}

function normalizeWorkbook(data) {
  if (!Array.isArray(data?.sheets) || !data.sheets.length) throw new Error('El Excel debe incluir al menos una hoja.');
  const names = new Set();
  return data.sheets.map((sheet) => {
    const name = String(sheet?.name || '').trim();
    if (!name || names.has(name)) throw new Error('Cada hoja del Excel debe tener un nombre único.');
    if (!Array.isArray(sheet.rows) || !sheet.rows.length) throw new Error(`La hoja ${name} debe incluir una fila.`);
    names.add(name);
    return { name, rows: sheet.rows.map((row) => Array.isArray(row) ? row : []) };
  });
}

async function workbookBuffer(data) {
  const sheets = normalizeWorkbook(data);
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${xmlText(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  const workbookRelationships = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  const contentTypes = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentTypes}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}</Relationships>`);
  sheets.forEach((sheet, index) => zip.file(`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(sheet.rows)));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function templateWorkbookData() {
  return { sheets: [
    { name: 'INSTRUCCIONES', rows: [['PLANTILLA DE CATÁLOGO'], ['Elimine las filas de ejemplo antes de importar. La importación crea un borrador y actualiza clientes por código.'], ['PRODUCTOS: el modelo se obtiene de la primera palabra de Descripción.'], ['CLIENTES: Representante es opcional; si se completa, debe ser el correo de una cuenta existente.'], ['TEJIDOS: T es tela y P es piel.']] },
    { name: 'PRODUCTOS', rows: [['Cod.', 'Descripción', 'Tipo', 'Opción'], ['EJ-P001', 'DEMO Sofá de ejemplo', 'Relax', 'izquierda']] },
    { name: 'CLIENTES', rows: [['Cod.', 'Nombre Comercial', 'Representante'], ['EJ-C001', 'Cliente de ejemplo', '']] },
    { name: 'TEJIDOS', rows: [['COD_TAPIZADO', 'NOMBRE_TAPIZADO', 'TIPO_TAPIZADO'], ['EJ-T001', 'Tela de ejemplo', 'T']] },
  ] };
}

function activeCatalogWorkbookData({ label, items, customers, fabrics }) {
  if (!items?.length) throw new Error('El catálogo publicado no contiene elementos compatibles para exportar.');
  if (!customers?.length) throw new Error('No hay clientes activos para incluir en la exportación.');
  if (!fabrics?.length) throw new Error('El catálogo publicado no contiene tejidos para exportar.');
  const unresolved = customers.find((customer) => customer.representativeId && !customer.representativeEmail);
  if (unresolved) throw new Error(`No se pudo resolver la asignación del cliente ${unresolved.clientCode}.`);
  return { label, sheets: [
    { name: 'PRODUCTOS', rows: [['Cod.', 'Descripción', 'Tipo', 'Opción'], ...items.map((item) => [item.code, item.description, item.categoryOption || '', item.sideOption || ''])] },
    { name: 'CLIENTES', rows: [['Cod.', 'Nombre Comercial', 'Representante'], ...customers.map((customer) => [customer.clientCode, customer.tradeName, customer.representativeEmail || ''])] },
    { name: 'TEJIDOS', rows: [['COD_TAPIZADO', 'NOMBRE_TAPIZADO', 'TIPO_TAPIZADO'], ...fabrics.map((fabric) => [fabric.code, fabric.name, fabric.fabricType])] },
  ] };
}

module.exports = { EXCEL_MIME, activeCatalogWorkbookData, templateWorkbookData, workbookBuffer };
