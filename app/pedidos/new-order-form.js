'use client';

import { useMemo, useState } from 'react';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function itemDetails(item) {
  return [item.categoryOption, item.sideOption].filter(Boolean).join(' - ');
}

function searchText(value) {
  return String(value || '')
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isOneToThreeSeatModuleWithArm(values) {
  const text = values.map(searchText).join(' ');
  return /(?:1|2|3)\s*pl/.test(text) && /c\s*\/\s*b/.test(text);
}

function isPouff(values) {
  return /\bpouf{1,2}s?\b/.test(values.map(searchText).join(' '));
}

function isChaiselongue(values) {
  return /\bchaise\s*longue\b|\bchaiselongue\b/.test(values.map(searchText).join(' '));
}

function isOneSeatTerminal(values) {
  const text = values.map(searchText).join(' ');
  return /1\s*pl/.test(text) && /\bterminal\b/.test(text);
}

function hasModuleDiagram(values) {
  return isPouff(values) || isChaiselongue(values) || isOneSeatTerminal(values) || isOneToThreeSeatModuleWithArm(values);
}

function hasLeftArm(values) {
  const text = values.map(searchText).join(' ');
  return /(?:^|[\s(])(?:izquierda|izquierdo|izq\.?)(?:$|[\s).,-])/.test(text)
    || /c\s*\/\s*b\s*[-.]?\s*(?:i|izq\.?)(?:$|[\s).,-])/.test(text)
    || /(?:2|3)plcb(?:i|izq)\b/.test(text);
}

function hasRightArm(values) {
  const text = values.map(searchText).join(' ');
  return /(?:^|[\s(])(?:derecha|derecho|der\.?)(?:$|[\s).,-])/.test(text)
    || /c\s*\/\s*b\s*[-.]?\s*(?:d|der\.?)(?:$|[\s).,-])/.test(text)
    || /(?:2|3)plcb(?:d|der)\b/.test(text);
}

function ModuleDiagram({ values }) {
  const text = values.map(searchText).join(' ');
  const pouff = isPouff(values);
  const chaiselongue = isChaiselongue(values);
  const oneSeatTerminal = isOneSeatTerminal(values);
  const leftArm = hasLeftArm(values);
  const rightArm = hasRightArm(values);
  const usesLeftBaseDiagram = chaiselongue || oneSeatTerminal;
  const sideLabel = usesLeftBaseDiagram
    ? rightArm ? 'derecho' : 'izquierdo'
    : leftArm ? 'izquierdo' : 'derecho';
  const isOneSeat = /1\s*pl/.test(text);
  const source = pouff
    ? '/assets/pouff.png'
    : chaiselongue
      ? '/assets/chaiselongue.png'
      : oneSeatTerminal
        ? '/assets/mod-1-pl-terminal.png'
      : isOneSeat
        ? '/assets/mod-1-pl-con-brazo.png'
        : '/assets/mod-2-3-pl-con-brazo.png';
  const label = pouff
    ? 'Pouff'
    : chaiselongue
      ? `Chaiselongue con brazo ${sideLabel}`
      : oneSeatTerminal
        ? `Módulo de 1 plaza terminal ${sideLabel}`
      : `Módulo de ${isOneSeat ? '1' : '2 o 3'} plazas con brazo ${sideLabel}`;
  const shouldMirror = usesLeftBaseDiagram ? rightArm : leftArm && !pouff;

  return <img className={`module-seat-arm-diagram${shouldMirror ? ' module-seat-arm-diagram-left' : ''}`} src={source} alt={label} title={label} />;
}

function emptyLegacySelection(module) {
  return {
    variantId: module.variants[0]?.id || '',
    side: module.needsSide ? 'izquierda' : ''
  };
}

export default function NewOrderForm({ models, customers, action, catalogFormat }) {
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [lines, setLines] = useState({});
  const [legacySelections, setLegacySelections] = useState({});
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId),
    [models, modelId]
  );
  const usesItems = catalogFormat === 'items';
  const catalogEntries = usesItems ? selectedModel?.items || [] : selectedModel?.modules || [];
  const normalizedQuery = searchText(searchQuery.trim());
  const filteredEntries = catalogEntries.filter((entry) => {
    if (!normalizedQuery) return true;
    const searchable = usesItems
      ? [entry.code, entry.description, entry.categoryOption, entry.sideOption]
      : [entry.name, ...entry.variants.map((variant) => variant.mechanism)];
    return searchable.some((value) => searchText(value).includes(normalizedQuery));
  });
  const cartEntries = Object.entries(lines).filter(([, line]) => line.quantity > 0);
  const totalUnits = cartEntries.reduce((sum, [, line]) => sum + line.quantity, 0);
  const requestedLines = cartEntries.map(([, line]) => (
    line.itemId
      ? { itemId: line.itemId, quantity: line.quantity }
      : { variantId: line.variantId, side: line.side, quantity: line.quantity }
  ));

  function changeModel(nextModelId) {
    setModelId(nextModelId);
    setSearchQuery('');
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
              {selectedModel?.name || 'Modelo'} - {catalogEntries.length} elementos disponibles
            </summary>
            <label className="order-catalog-search">
              Buscar módulo o artículo
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Código, descripción u opción"
              />
            </label>
            {searchQuery ? <p className="order-catalog-result-count">{filteredEntries.length} de {catalogEntries.length} elementos</p> : null}
            <div className="module-selection-list" aria-live="polite">
              {filteredEntries.length === 0 ? <p className="cart-empty">No hay elementos que coincidan con la búsqueda.</p> : null}
              {usesItems
                ? filteredEntries.map((item) => (
                    <article className="order-module order-catalog-item" key={item.id}>
                      <div>
                        <div className="order-module-name">
                          <strong>{item.code}</strong>
                          {hasModuleDiagram([item.code, item.description, item.categoryOption, item.sideOption]) ? <ModuleDiagram values={[item.code, item.description, item.categoryOption, item.sideOption]} /> : null}
                        </div>
                        <small>{item.description}</small>
                      </div>
                      <span className="order-tag">{itemDetails(item) || 'Sin opciones'}</span>
                      <button className="secondary-button add-item-button" type="button" onClick={() => addItem(item)}>+ Añadir artículo</button>
                    </article>
                  ))
                : filteredEntries.map((module) => {
                    const selection = legacySelections[module.id] || emptyLegacySelection(module);
                    const hasSeatArmDiagram = hasModuleDiagram([module.name, ...module.variants.map((variant) => variant.mechanism)]);
                    return (
                      <article className="order-module" key={module.id}>
                        <div>
                          <div className="order-module-name">
                            <strong>{module.name}</strong>
                            {hasSeatArmDiagram ? <ModuleDiagram values={[module.name, ...module.variants.map((variant) => variant.mechanism)]} /> : null}
                          </div>
                          {module.needsSide ? <small>Requiere orientacion</small> : null}
                        </div>
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
