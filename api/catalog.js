const fs = require('fs');
const path = require('path');
const { catalogFromBuffer } = require('../lib/catalog');

const sourcePath = path.join(process.cwd(), 'TARIFA NACIONAL PEDRO ORTIZ - 2026.xlsx');

async function readRequest(req) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new Error('El archivo supera el límite de 5 MB.');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

module.exports = async (req, res) => {
  try {
    const isImport = req.method === 'POST';
    const fileStats = isImport ? null : fs.statSync(sourcePath);
    const buffer = isImport ? await readRequest(req) : fs.readFileSync(sourcePath);
    const catalog = await catalogFromBuffer(buffer, isImport ? 'Importación manual' : path.basename(sourcePath));
    if (fileStats) catalog.sourceModifiedAt = fileStats.mtime.toISOString();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(catalog);
  } catch (error) {
    res.status(400).json({ error: error.message || 'No se pudo leer el catálogo.' });
  }
};
