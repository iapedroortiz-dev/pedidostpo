function searchText(value) {
  return String(value || '')
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function bedDiagramType(values) {
  const text = values.map(searchText).join(' ');
  if (!/\bcama\b/.test(text)) return null;
  return /\bc\s*\/\s*b\b/.test(text) ? 'bed-arm' : 'bed';
}

function isChaiselongueModule(values) {
  return /\bchaiselongue\b|\bchlong\b/.test(values.map(searchText).join(' '));
}

module.exports = { bedDiagramType, isChaiselongueModule };
