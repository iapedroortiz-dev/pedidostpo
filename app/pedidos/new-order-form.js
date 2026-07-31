'use client';

import { useMemo, useState } from 'react';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function itemDetails(item) {
  return [item.categoryOption, item.sideOption].filter(Boolean).join(' - ');
}

function emptyLegacySelection(module) {
  return {
    variantId: module.variants[0]?.id || '',
    side: module.needsSide ? 'izquierda' : ''
  };
}

export default function NewOrderForm({ models, customers, action, catalogFormat }) {
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [lines, setLines] = useState({});
  const [legacySelections, setLegacySelections] = useState({});
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId),
    [models, modelId]
  );
  const usesItems = catalogFormat === 'items';
  const cartEntries = Object.entries(lines).filter(([, line]) => line.quantity > 0);
  const totalUnits = cartEntries.reduce((sum, [, line]) => sum + line.quantity, 0);
  const requestedLines = cartEntries.map(([, line]) => (
    line.itemId
      ? { itemId: line.itemId, quantity: line.quantity }
      : { variantId: line.variantId, side: line.side, quantity: line.quantity }
  ));

  function changeModel(nextModelId) {
    setModelId(nextModelId);
  }

  function adjustLine(key, amount, defaults) {
    setLines((previous) => {
      const current = previous[key] || defaults;
      const quantity = Math.max(0, Math.min(999, current.quantity + amount));
      if (!quantity) {
        const { [key]: removed, ...remaining } = previous;
        return remaining;
      }
      return { ...previous, [key]: { ...current, quantity } };
    });
  }

  function updateLegacySelection(moduleId, field, value) {
    setLegacySelections((previous) => ({
      ...previous,
      [moduleId]: { ...(previous[moduleId] || {}), [field]: value }
    }));
  }

  function addItem(item) {
    adjustLine(item.id, 1, {
      itemId: item.id,
      quantity: 0,
      displayModel: selectedModel?.name || '',
      displayName: item.code,
      displayDescription: item.description,
      displayDetails: itemDetails(item)
    });
  }

  function addLegacyModule(module) {
    const selection = legacySelections[module.id] || emptyLegacySelection(module);
    const variant = module.variants.find((item) => item.id === selection.variantId) || module.variants[0];
    if (!variant) return;
    const key = `${module.id}:${variant.id}:${selection.side || 'sin-lado'}`;
    adjustLine(key, 1, {
      variantId: variant.id,
      side: module.needsSide ? selection.side : '',
      quantity: 0,
      displayModel: selectedModel?.name || '',
      displayName: module.name,
      displayDescription: variant.mechanism,
      displayDetails: module.needsSide ? selection.side : ''
    });
  }

  return (
    <form action={action} className="order-form">
      <div className="order-form-grid">
        <label className="order-customer-select">Cliente<select name="customerId" defaultValue="" required><option value="" disabled>Selecciona un cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.client_code} - {customer.trade_name}</option>)}</select></label>
        <label>Fecha del pedido<input name="orderDate" type="date" defaultValue={today()} required /></label>
        <label>Modelo<select name="catalogModelId" value={modelId} onChange={(event) => changeModel(event.target.value)} required>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      </div>

      <section className="module-selection" aria-labelledby="catalog-selection-title">
        <div>
          <p className="eyebrow">CONFIGURACION</p>
          <h3 id="catalog-selection-title">Elementos del pedido</h3>
          <p>Selecciona los artículos y revísalos en el carrito antes de enviar el pedido.</p>
        </div>

        <div className="module-selection-layout">
          <details className="order-catalog-details">
            <summary>
              {selectedModel?.name || 'Modelo'} - {(usesItems ? selectedModel?.items : selectedModel?.modules)?.length || 0} elementos disponibles
            </summary>
            <div className="module-selection-list">
              {usesItems
                ? (selectedModel?.items || []).map((item) => (
                    <article className="order-module order-catalog-item" key={item.id}>
                      <div>
                        <strong>{item.code}</strong>
                        <small>{item.description}</small>
                      </div>
                      <span className="order-tag">{itemDetails(item) || 'Sin opciones'}</span>
                      <button className="secondary-button add-item-button" type="button" onClick={() => addItem(item)}>+ Añadir artículo</button>
                    </article>
                  ))
                : (selectedModel?.modules || []).map((module) => {
                    const selection = legacySelections[module.id] || emptyLegacySelection(module);
                    return (
                      <article className="order-module" key={module.id}>
                        <div><strong>{module.name}</strong>{module.needsSide ? <small>Requiere orientacion</small> : null}</div>
                        {module.variants.length > 1 ? <label>Categoria<select value={selection.variantId} onChange={(event) => updateLegacySelection(module.id, 'variantId', event.target.value)}>{module.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.mechanism}</option>)}</select></label> : <span className="order-tag">{module.variants[0]?.mechanism || 'Sin categoria'}</span>}
                        {module.needsSide ? <label>Lado<select value={selection.side} onChange={(event) => updateLegacySelection(module.id, 'side', event.target.value)}><option value="izquierda">Izquierda</option><option value="derecha">Derecha</option></select></label> : null}
                        <button className="secondary-button add-item-button" type="button" onClick={() => addLegacyModule(module)}>+ Añadir artículo</button>
                      </article>
                    );
                  })}
            </div>
          </details>

          <aside className="order-cart" aria-live="polite">
            <div className="order-cart-heading"><div><p className="eyebrow">CARRITO</p><h3>Artículos añadidos</h3></div><span className="cart-total">{totalUnits}</span></div>
            {cartEntries.length ? (
              <div className="cart-lines">
                {cartEntries.map(([key, line]) => (
                  <article className="cart-line" key={key}>
                    <div><strong>{line.displayName}</strong><small>{line.displayModel}{line.displayDescription ? ` - ${line.displayDescription}` : ''}{line.displayDetails ? ` - ${line.displayDetails}` : ''}</small></div>
                    <div className="cart-quantity" aria-label={`Unidades de ${line.displayName}`}><button type="button" onClick={() => adjustLine(key, -1, line)} aria-label={`Restar una unidad de ${line.displayName}`}>−</button><span>{line.quantity}</span><button type="button" onClick={() => adjustLine(key, 1, line)} aria-label={`Añadir una unidad de ${line.displayName}`}>+</button></div>
                  </article>
                ))}
              </div>
            ) : <p className="cart-empty">Aún no has añadido artículos.</p>}
            <div className="cart-footer"><span>Total de unidades</span><strong>{totalUnits}</strong></div>
          </aside>
        </div>
      </section>

      <label>Notas<textarea name="notes" maxLength="2000" rows="4" /></label>
      <input type="hidden" name="lines" value={JSON.stringify(requestedLines)} />
      <button type="submit" className="primary-button" disabled={!cartEntries.length}>Enviar pedido a pedidos</button>
    </form>
  );
}
