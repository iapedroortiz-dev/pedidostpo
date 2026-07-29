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

function mechanismFromRow(name = '', value = '') {
  if (value.trim()) return value.trim();
  if (/relax\s*motor|\bmotor\b/i.test(name)) return 'Relax Motor';
  if (/deslizante/i.test(name)) return 'Deslizante';
  if (/fijo/i.test(name)) return 'Fijo';
  return 'Sin mecanismo';
}

async function sheetRowsFromXlsx(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const sharedXml =
    (await zip.file('xl/sharedStrings.xml')?.async('string')) || '';

  const sharedStrings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    (entry) => textIn(entry[1], 't')
  );

  const workbookXml =
    (await zip.file('xl/workbook.xml')?.async('string')) || '';

  const sheetMatch =
    workbookXml.match(/<sheet\s+[^>]*r:id="([^"]+)"[^>]*>/) ||
    workbookXml.match(/<sheet\s+[^>]*>/);

  const relationId = sheetMatch?.[1];

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
    throw new Error('No se ha encontrado una hoja válida en el archivo Excel.');
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

        if (kind === 's') {
          value = sharedStrings[Number(value)] || '';
        }

        if (kind === 'inlineStr') {
          value = textIn(cell[2], 't');
        }

        values[column] = value.trim();
      }

      return values;
    }
  );
}

async function catalogFromBuffer(buffer, sourceName = 'Excel') {
  const rows = await sheetRowsFromXlsx(buffer);
  const models = [];
  let currentModel = null;

  for (const row of rows) {
    const name = row.B;
    if (!name) continue;

    const isModelHeader = [row.C, row.D].some(
      (value) => comparableName(value).trim() === 'opcion'
    );

    if (isModelHeader) {
      currentModel = {
        id: `model-${models.length + 1}`,
        name: name.trim(),
        modules: []
      };

      models.push(currentModel);
      continue;
    }

    if (!currentModel) continue;

    const mechanism = mechanismFromRow(name, row.C || '');
    const needsSide = /izq\s*\/\s*der/i.test(row.D || '');

    const module = {
      id: `${currentModel.id}-module-${currentModel.modules.length + 1}`,
      name: name.trim(),
      needsSide,
      variants: [
        {
          id: `${currentModel.id}-module-${currentModel.modules.length + 1}-variant-1`,
          mechanism
        }
      ],
      referenceCount: 1
    };

    currentModel.modules.push(module);
  }

  if (!models.length) {
    throw new Error(
      'El Excel no contiene cabeceras de modelo con la columna “Opcion”.'
    );
  }

  return {
    sourceName,
    generatedAt: new Date().toISOString(),
    models
  };
}

module.exports = { catalogFromBuffer };