const JSZip = require('jszip');

function decodeXml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function textIn(xml, tag) {
  const match = xml.match(
    new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)</${tag}>`)
  );

  return match ? decodeXml(match[1].replace(/<[^>]+>/g, '')) : '';
}

function columnFromRef(ref = '') {
  return (ref.match(/[A-Z]+/) || [''])[0];
}

function comparableName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function xmlAttribute(xml, name) {
  const match = xml.match(new RegExp(`${name}="([^"]+)"`));
  return match ? decodeXml(match[1]) : '';
}

function normalizedHeader(value = '') {
  return comparableName(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function sheetRowsFromXlsx(buffer, requestedSheetName = '') {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml =
    (await zip.file('xl/sharedStrings.xml')?.async('string')) || '';

  const sharedStrings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    (entry) => textIn(entry[1], 't')
  );

  const workbookXml =
    (await zip.file('xl/workbook.xml')?.async('string')) || '';
  const sheets = [...workbookXml.matchAll(/<sheet\s+([^>]*)\/?>(?:<\/sheet>)?/g)]
    .map((entry) => ({
      name: xmlAttribute(entry[1], 'name'),
      relationId: xmlAttribute(entry[1], 'r:id')
    }));
  const sheet = requestedSheetName
    ? sheets.find((entry) => comparableName(entry.name) === comparableName(requestedSheetName))
    : sheets[0];
  const relationId = sheet?.relationId;
  const relsXml =
    (await zip.file('xl/_rels/workbook.xml.rels')?.async('string')) || '';
  const targetMatch =
    relationId &&
    relsXml.match(
      new RegExp(
        `<Relationship[^>]*Id="${relationId}"[^>]*Target="([^"]+)"[^>]*/>`
      )
    );
  const sheetPath = targetMatch
    ? `xl/${targetMatch[1].replace(/^\//, '')}`
    : 'xl/worksheets/sheet1.xml';
  const sheetXml = await zip.file(sheetPath)?.async('string');

  if (!sheetXml) {
    throw new Error('No se ha encontrado una hoja valida en el archivo Excel.');
  }

  return [...sheetXml.matchAll(/<row\s+[^>]*>([\s\S]*?)<\/row>/g)].map(
    (row) => {
      const values = {};

      for (const cell of row[1].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attrs = cell[1];
        const column = columnFromRef(
          (attrs.match(/r="([^"]+)"/) || [])[1]
        );
        const kind = (attrs.match(/t="([^"]+)"/) || [])[1];
        let value = textIn(cell[2], 'v');

        if (kind === 's') value = sharedStrings[Number(value)] || '';
        if (kind === 'inlineStr') value = textIn(cell[2], 't');

        values[column] = value.trim();
      }

      return values;
    }
  );
}

function customersFromRows(rows) {
  const headerRowIndex = rows.findIndex((row) => {
    const headers = Object.values(row).map(normalizedHeader);
    return headers.some((header) => header === 'cod' || header.includes('codigo')) &&
      headers.some((header) => header.includes('nombre comercial'));
  });

  if (headerRowIndex < 0) {
    throw new Error('La hoja CLIENTES debe incluir las columnas Cod. y Nombre Comercial.');
  }

  const header = rows[headerRowIndex];
  const columnFor = (predicate) => Object.entries(header).find(([, value]) => predicate(normalizedHeader(value)))?.[0];
  const codeColumn = columnFor((value) => value === 'cod' || value.includes('codigo'));
  const nameColumn = columnFor((value) => value.includes('nombre comercial'));
  const representativeColumn = columnFor((value) => value.includes('representante'));
  const customers = [];
  const seenCodes = new Set();

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const clientCode = String(row[codeColumn] || '').trim();
    const tradeName = String(row[nameColumn] || '').trim();
    const representativeEmail = String(representativeColumn ? row[representativeColumn] || '' : '')
      .trim()
      .toLocaleLowerCase('es-ES');

    if (!clientCode && !tradeName && !representativeEmail) continue;
    if (!clientCode || !tradeName) {
      throw new Error(`La fila ${index + 1} de CLIENTES debe incluir codigo y nombre comercial.`);
    }
    if (seenCodes.has(clientCode)) {
      throw new Error(`El codigo de cliente ${clientCode} esta repetido en la hoja CLIENTES.`);
    }
    if (representativeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(representativeEmail)) {
      throw new Error(`El representante de la fila ${index + 1} no tiene un email valido.`);
    }

    seenCodes.add(clientCode);
    customers.push({ clientCode, tradeName, representativeEmail: representativeEmail || null });
  }

  if (!customers.length) {
    throw new Error('La hoja CLIENTES no contiene clientes validos.');
  }

  return customers;
}

async function catalogFromBuffer(buffer, sourceName = 'Excel') {
  const rows = await sheetRowsFromXlsx(buffer);
  const models = [];
  let currentModel = null;

  for (const [rowIndex, row] of rows.entries()) {
    const code = (row.A || '').trim();
    const description = (row.B || '').trim();
    const categoryOption = (row.C || '').trim();
    const sideOption = (row.D || '').trim();
    const isEmptyRow = !code && !description && !categoryOption && !sideOption;
    const isModelHeader =
      comparableName(code).trim() === 'codigo' &&
      Boolean(description) &&
      [categoryOption, sideOption].some(
        (value) => comparableName(value).trim() === 'opcion'
      );

    if (isEmptyRow) continue;

    if (isModelHeader) {
      currentModel = {
        id: `model-${models.length + 1}`,
        name: description,
        items: [],
        itemCodes: new Set()
      };
      models.push(currentModel);
      continue;
    }

    if (!currentModel) {
      throw new Error(
        `La fila ${rowIndex + 1} contiene un elemento antes de la cabecera de un modelo.`
      );
    }

    if (!code || !description) {
      throw new Error(
        `La fila ${rowIndex + 1} debe incluir codigo y descripcion.`
      );
    }

    const normalizedCode = comparableName(code).trim();
    if (currentModel.itemCodes.has(normalizedCode)) {
      throw new Error(
        `El codigo ${code} esta repetido en el modelo ${currentModel.name}.`
      );
    }

    currentModel.itemCodes.add(normalizedCode);
    currentModel.items.push({
      id: `${currentModel.id}-item-${currentModel.items.length + 1}`,
      code,
      description,
      categoryOption: categoryOption || null,
      sideOption: sideOption || null
    });
  }

  if (!models.length) {
    throw new Error(
      'El Excel no contiene cabeceras de modelo con CODIGO y Opcion.'
    );
  }

  for (const model of models) {
    if (!model.items.length) {
      throw new Error(`El modelo ${model.name} no contiene elementos.`);
    }
    delete model.itemCodes;
  }

  return {
    sourceName,
    generatedAt: new Date().toISOString(),
    models
  };
}

async function catalogAndCustomersFromBuffer(buffer, sourceName = 'Excel') {
  const catalog = await catalogFromBuffer(buffer, sourceName);
  const customerRows = await sheetRowsFromXlsx(buffer, 'CLIENTES');

  return {
    ...catalog,
    customers: customersFromRows(customerRows)
  };
}

module.exports = { catalogFromBuffer, catalogAndCustomersFromBuffer };
