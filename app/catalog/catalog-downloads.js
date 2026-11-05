'use client';

export default function CatalogDownloads() {
  return (
    <div className="catalog-downloads">
      <div>
        <p className="eyebrow">ARCHIVOS DE TRABAJO</p>
        <h3>Plantilla y exportación</h3>
        <p>La plantilla incluye las columnas y ejemplos requeridos. La exportación incluye el catálogo publicado, clientes activos y sus asignaciones actuales.</p>
      </div>
      <div className="catalog-download-actions">
        <a className="secondary-button" href="/api/catalog/template">Descargar plantilla Excel</a>
        <a className="secondary-button" href="/api/catalog/export">Exportar catálogo publicado</a>
      </div>
      <p className="catalog-download-notice"><strong>Antes de importar:</strong> elimine las filas de ejemplo de la plantilla. Una importación crea un borrador y actualiza clientes por código; no restaura una versión histórica ni conserva clientes inactivos.</p>
    </div>
  );
}
