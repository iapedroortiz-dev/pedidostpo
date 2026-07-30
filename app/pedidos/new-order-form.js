'use client';

import { useMemo, useState } from 'react';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function itemDetails(item) {
  return [item.categoryOption, item.sideOption].filter(Boolean).join(' - ');
}

export default function NewOrderForm({ models, action, catalogFormat }) {
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [lines, setLines] = useState({});
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId),
    [models, modelId]
  );
  const usesItems = catalogFormat === 'items';

  function changeModel(nextModelId) {
    setModelId(nextModelId);
    setLines({});
  }

  function updateLine(id, defaults, field, value) {
    const current = lines[id] || defaults;
    setLines((previous) => ({
      ...previous,
      [id]: { ...current, [field]: value }
    }));
  }

  const selectedLines = Object.values(lines)
    .filter((line) => Number(line.quantity) > 0)
    .map((line) => ({ ...line, quantity: Number(line.quantity) }));

  return (
    <form action={action} className="order-form">
      <div className="order-form-grid">
        <label>Codigo de cliente<input name="clientCode" maxLength="120" required /></label>
        <label>Cliente<input name="clientName" maxLength="200" required /></label>
        <label>Fecha del pedido<input name="orderDate" type="date" defaultValue={today()} required /></label>
        <label>Modelo<select name="catalogModelId" value={modelId} onChange={(event) => changeModel(event.target.value)} required>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      </div>

      <section className="module-selection" aria-labelledby="catalog-selection-title">
        <div>
          <p className="eyebrow">CONFIGURACION</p>
          <h3 id="catalog-selection-title">Elementos del pedido</h3>
          <p>Indica las unidades necesarias de cada elemento.</p>
        </div>

        <details className="order-catalog-details">
          <summary>
            {selectedModel?.name || 'Modelo'} - {(usesItems ? selectedModel?.items : selectedModel?.modules)?.length || 0} elementos
          </summary>
          <div className="module-selection-list">
            {usesItems
            ? (selectedModel?.items || []).map((item) => {
                const line = lines[item.id] || { itemId: item.id, quantity: 0 };
                return (
                  <article className="order-module order-catalog-item" key={item.id}>
                    <div>
                      <strong>{item.code}</strong>
                      <small>{item.description}</small>
                    </div>
                    <span className="order-tag">{itemDetails(item) || 'Sin opciones'}</span>
                    <label>Unidades<input type="number" min="0" max="999" value={line.quantity} onChange={(event) => updateLine(item.id, line, 'quantity', event.target.value)} /></label>
                  </article>
                );
              })
            : (selectedModel?.modules || []).map((module) => {
                const line = lines[module.id] || {
                  variantId: module.variants[0]?.id || '',
                  quantity: 0,
                  side: module.needsSide ? 'izquierda' : ''
                };
                return (
                  <article className="order-module" key={module.id}>
                    <div><strong>{module.name}</strong>{module.needsSide ? <small>Requiere orientacion</small> : null}</div>
                    {module.variants.length > 1 ? <label>Categoria<select value={line.variantId} onChange={(event) => updateLine(module.id, line, 'variantId', event.target.value)}>{module.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.mechanism}</option>)}</select></label> : <span className="order-tag">{module.variants[0]?.mechanism || 'Sin categoria'}</span>}
                    {module.needsSide ? <label>Lado<select value={line.side} onChange={(event) => updateLine(module.id, line, 'side', event.target.value)}><option value="izquierda">Izquierda</option><option value="derecha">Derecha</option></select></label> : null}
                    <label>Unidades<input type="number" min="0" max="999" value={line.quantity} onChange={(event) => updateLine(module.id, line, 'quantity', event.target.value)} /></label>
                  </article>
                );
              })}
          </div>
        </details>
      </section>

      <label>Notas<textarea name="notes" maxLength="2000" rows="4" /></label>
      <input type="hidden" name="lines" value={JSON.stringify(selectedLines)} />
      <button type="submit" className="primary-button">Crear pedido</button>
    </form>
  );
}
