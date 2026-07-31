'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportForm() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  async function importCatalog(event) {
    event.preventDefault();
    setStatus('Importando y validando el Excel...');

    const form = event.currentTarget;
    const response = await fetch('/api/catalog/import', {
      method: 'POST',
      body: new FormData(form)
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error || 'No se pudo importar el catalogo.');
      return;
    }

    form.reset();
    setStatus(
      `Version "${payload.label}" creada en borrador con ${payload.modelCount} modelos, ${payload.itemCount} elementos y ${payload.customerCount} clientes actualizados.`
    );
    router.refresh();
  }

  return (
    <section className="catalog-panel">
      <div>
        <p className="eyebrow">IMPORTACION PRIVADA</p>
        <h2>Subir nueva tarifa</h2>
        <p>
          El archivo se guarda en almacenamiento privado y genera una version
          en borrador; no se publica automaticamente.
        </p>
      </div>

      <form className="catalog-form" onSubmit={importCatalog}>
        <label>
          Nombre de la version
          <input
            name="label"
            maxLength="120"
            placeholder="Ej. Tarifa nacional 2026 - revision julio"
          />
        </label>

        <label>
          Archivo Excel
          <input
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </label>

        <button type="submit">Importar como borrador</button>
      </form>

      {status ? <p className="catalog-status" aria-live="polite">{status}</p> : null}
    </section>
  );
}
