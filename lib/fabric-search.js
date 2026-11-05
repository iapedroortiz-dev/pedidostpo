function searchText(value) {
  return String(value || '')
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchingFabrics(fabrics, search) {
  const query = searchText(String(search || '').trim());
  if (!query) return [];
  return fabrics.filter((fabric) => searchText(`${fabric.code} ${fabric.name}`).includes(query));
}

module.exports = { matchingFabrics };
