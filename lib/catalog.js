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

function fabricsFromRows(rows) {
  const headerRowIndex = rows.findIndex((row) => {
    const headers = Object.values(row).map(normalizedHeader);
    return headers.includes('cod tapizado') &&
      headers.includes('nombre tapizado') &&
      headers.includes('tipo tapizado');
  });

  if (headerRowIndex < 0) {
    throw new Error(
      'La hoja TEJIDOS debe incluir COD_TAPIZADO, NOMBRE_TAPIZADO y TIPO_TAPIZADO.'
    );
  }

  const header = rows[headerRowIndex];
  const columnFor = (name) => Object.entries(header)
    .find(([, value]) => normalizedHeader(value) === name)?.[0];
  const codeColumn = columnFor('cod tapizado');
  const nameColumn = columnFor('nombre tapizado');
  const typeColumn = columnFor('tipo tapizado');
  const fabrics = [];
  const fabricByCode = new Map();

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const code = String(row[codeColumn] || '').trim();
    const name = String(row[nameColumn] || '').trim();
    const fabricType = String(row[typeColumn] || '').trim().toUpperCase();

    if (!code && !name && !fabricType) continue;
    if (!code || !name || !fabricType) {
      throw new Error(`La fila ${index + 1} de TEJIDOS debe incluir código, nombre y tipo.`);
    }
    if (!['P', 'T'].includes(fabricType)) {
      throw new Error(`El tipo de tejido de la fila ${index + 1} debe ser P o T.`);
    }

    const normalizedCode = comparableName(code).trim();
    const existingFabric = fabricByCode.get(normalizedCode);
    if (existingFabric) {
      if (existingFabric.name === name && existingFabric.fabricType === fabricType) {
        continue;
      }
      throw new Error(
        `El código de tapizado ${code} tiene datos distintos en más de una fila de TEJIDOS.`
      );
    }

    const fabric = { code, name, fabricType };
    fabricByCode.set(normalizedCode, fabric);
    fabrics.push(fabric);
  }

  if (!fabrics.length) {
    throw new Error('La hoja TEJIDOS no contiene tejidos válidos.');
  }

  return fabrics;
}

async function catalogFromBuffer(buffer, sourceName = 'Excel') {
  const rows = await sheetRowsFromXlsx(buffer, 'PRODUCTOS');
  const models = [];
  const modelByName = new Map();
  const headerRowIndex = rows.findIndex((row) => {
    const headers = Object.values(row).map(normalizedHeader);
    return headers.some((header) => header === 'cod' || header.includes('codigo')) &&
      headers.some((header) => header.includes('descripcion')) &&
      headers.some((header) => header === 'tipo') &&
      headers.some((header) => header === 'opcion');
  });

  if (headerRowIndex < 0) {
    throw new Error(
      'La hoja PRODUCTOS debe incluir las columnas Cod., Descripción, Tipo y Opción.'
    );
  }

  const header = rows[headerRowIndex];
  const columnFor = (predicate) => Object.entries(header)
    .find(([, value]) => predicate(normalizedHeader(value)))?.[0];
  const codeColumn = columnFor((value) => value === 'cod' || value.includes('codigo'));
  const descriptionColumn = columnFor((value) => value.includes('descripcion'));
  const typeColumn = columnFor((value) => value === 'tipo');
  const optionColumn = columnFor((value) => value === 'opcion');

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const code = String(row[codeColumn] || '').trim();
    const description = String(row[descriptionColumn] || '').trim();
    const categoryOption = String(row[typeColumn] || '').trim();
    const sideOption = String(row[optionColumn] || '').trim();
    const isEmptyRow = !code && !description && !categoryOption && !sideOption;

    if (isEmptyRow) continue;

    if (!code || !description) {
      throw new Error(
        `La fila ${rowIndex + 1} de PRODUCTOS debe incluir Cod. y Descripción.`
      );
    }

    const modelName = description.split(/\s+/)[0];
    const modelKey = comparableName(modelName).trim();
    let model = modelByName.get(modelKey);
    if (!model) {
      model = {
        id: `model-${models.length + 1}`,
        name: modelName,
        items: [],
        itemCodes: new Set()
      };
      models.push(model);
      modelByName.set(modelKey, model);
    }

    const normalizedCode = comparableName(code).trim();
    if (model.itemCodes.has(normalizedCode)) {
      throw new Error(
        `El código ${code} está repetido en el modelo ${model.name}.`
      );
    }

    model.itemCodes.add(normalizedCode);
    model.items.push({
      id: `${model.id}-item-${model.items.length + 1}`,
      code,
      description,
      categoryOption: categoryOption || null,
      sideOption: sideOption || null
    });
  }

  if (!models.length) {
    throw new Error(
      'La hoja PRODUCTOS no contiene elementos válidos.'
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
  const fabricRows = await sheetRowsFromXlsx(buffer, 'TEJIDOS');

  return {
    ...catalog,
    customers: customersFromRows(customerRows),
    fabrics: fabricsFromRows(fabricRows)
  };
}

module.exports = { catalogFromBuffer, catalogAndCustomersFromBuffer };
