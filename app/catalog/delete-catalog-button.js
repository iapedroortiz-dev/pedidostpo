'use client';

export default function DeleteCatalogButton({ action, versionId, versionLabel }) {
  function confirmDeletion(event) {
    if (!window.confirm(`¿Eliminar definitivamente la tarifa "${versionLabel}"? Esta acción no se puede deshacer.`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmDeletion}>
      <input type="hidden" name="catalogVersionId" value={versionId} />
      <button className="delete-catalog-button" type="submit">Eliminar</button>
    </form>
  );
}
