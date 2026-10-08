'use client';

export default function CatalogModelBulkForm({ action, versionId, enabled, children }) {
  if (!enabled) return children;

  function confirmDeletion(event) {
    const selectedCount = new FormData(event.currentTarget).getAll('modelIds').length;
    if (!selectedCount) {
      event.preventDefault();
      window.alert('Selecciona al menos un modelo.');
      return;
    }
    if (!window.confirm(`¿Eliminar ${selectedCount} modelo(s) y todos sus artículos? Esta acción no se puede deshacer.`)) {
      event.preventDefault();
    }
  }

  return (
    <form className="catalog-model-bulk-form" action={action} onSubmit={confirmDeletion}>
      <input type="hidden" name="catalogVersionId" value={versionId} />
      <div className="catalog-model-bulk-actions">
        <span>Selecciona los modelos que quieras retirar de esta tarifa.</span>
        <button className="delete-catalog-button" type="submit">Eliminar modelos seleccionados</button>
      </div>
      {children}
    </form>
  );
}
