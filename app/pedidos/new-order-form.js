'use client';

import { useMemo, useState } from 'react';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewOrderForm({ models, action }) {
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [lines, setLines] = useState({});
  const selectedModel = useMemo(() => models.find((model) => model.id === modelId), [models, modelId]);

  function changeModel(nextModelId) {
    setModelId(nextModelId);
    setLines({});
  }

  function updateLine(module, field, value) {
    const current = lines[module.id] || {
      variantId: module.variants[0]?.id || '',
      quantity: 0,
      side: module.needsSide ? 'izquierda' : ''
    };
    setLines((previous) => ({ ...previous, [module.id]: { ...current, [field]: value } }));
  }

  const selectedLines = Object.values(lines)
    .filter((line) => Number(line.quantity) > 0)
    .map((line) => ({ variantId: line.variantId, quantity: Number(line.quantity), side: line.side }));

  return (
    <form action={action} className="order-form">
      <div className="order-form-grid">
        <label>Código de cliente<input name="clientCode" maxLength="120" required /></label>
        <label>Cliente<input name="clientName" maxLength="200" required /></label>
        <label>Fecha del pedido<input name="orderDate" type="date" defaultValue={today()} required /></label>
        <label>Modelo<select name="catalogModelId" value={modelId} onChange={(event) => changeModel(event.target.value)} required>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      </div>

      <section className="module-selection" aria-labelledby="module-selection-title">
        <div><p className="eyebrow">CONFIGURACIÓN</p><h3 id="module-selection-title">Módulos del pedido</h3><p>Indica las unidades que necesitas de cada módulo.</p></div>
        <div className="module-selection-list">
          {(selectedModel?.modules || []).map((module) => {
            const line = lines[module.id] || { variantId: module.variants[0]?.id || '', quantity: 0, side: module.needsSide ? 'izquierda' : '' };
            return <article className="order-module" key={module.id}>
              <div><strong>{module.name}</strong>{module.needsSide ? <small>Requiere orientación</small> : null}</div>
              {module.variants.length > 1 ? <label>Categoría<select value={line.variantId} onChange={(event) => updateLine(module, 'variantId', event.target.value)}>{module.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.mechanism}</option>)}</select></label> : <span className="order-tag">{module.variants[0]?.mechanism || 'Sin categoría'}</span>}
              {module.needsSide ? <label>Lado<select value={line.side} onChange={(event) => updateLine(module, 'side', event.target.value)}><option value="izquierda">Izquierda</option><option value="derecha">Derecha</option></select></label> : null}
              <label>Unidades<input type="number" min="0" max="999" value={line.quantity} onChange={(event) => updateLine(module, 'quantity', event.target.value)} /></label>
            </article>;
          })}
        </div>
      </section>

      <label>Notas<textarea name="notes" maxLength="2000" rows="4" /></label>
      <input type="hidden" name="lines" value={JSON.stringify(selectedLines)} />
      <button type="submit" className="primary-button">Crear pedido</button>
    </form>
  );
}
