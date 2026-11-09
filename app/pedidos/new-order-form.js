'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { matchingFabrics } from '../../lib/fabric-search';
import { bedDiagramType, isChaiselongueModule } from '../../lib/module-diagram';
import { moveCompositionUnit } from '../../lib/order-composition';
import SubmitOrderButton from './submit-order-button';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatOrderDate(value) {
  if (!value) return 'Sin indicar';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`));
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

function isOneSeatModuleWithoutArm(values) {
  const text = values.map(searchText).join(' ');
  return /1\s*pl/.test(text) && (/(?:s\s*\/\s*b|sin\s+brazo)/.test(text));
}

function isPouff(values) {
  return /\bpouf{1,2}s?\b/.test(values.map(searchText).join(' '));
}

function isArmchair(values) {
  return /\bsillon(?:es)?\b/.test(values.map(searchText).join(' '));
}

function isSofa(values) {
  return /\bsofas?\b/.test(values.map(searchText).join(' '));
}

function isChaiselongue(values) {
  return isChaiselongueModule(values);
}

function isOneSeatTerminal(values) {
  const text = values.map(searchText).join(' ');
  return /\bterminal\b/.test(text);
}

function isFabric(values) {
  return /\btela\b/.test(values.map(searchText).join(' '));
}

function isLeather(values) {
  return /\bpiel\b|\bleather\b/.test(values.map(searchText).join(' '));
}

function mechanismFilterId(values) {
  const text = values.map(searchText).join(' ');
  if (/\brelax\b/.test(text)) return 'relax';
  if (/\bdeslizante\b/.test(text)) return 'sliding';
  return 'fixed';
}

const diagramFilterOptions = [
  { id: 'sofa', label: 'Sofá', source: '/assets/sofa.png' },
  { id: 'armchair', label: 'Sillón', source: '/assets/sillon.png' },
  { id: 'one-seat-no-arm', label: '1 plaza sin brazo', source: '/assets/mod-1-pl-sin-brazo.png' },
  { id: 'one-seat-arm-left', label: '1 plaza con brazo izquierdo', source: '/assets/mod-1-pl-con-brazo.png', mirrored: true },
  { id: 'one-seat-arm-right', label: '1 plaza con brazo derecho', source: '/assets/mod-1-pl-con-brazo.png' },
  { id: 'two-three-seat-arm-left', label: '2 o 3 plazas con brazo izquierdo', source: '/assets/mod-2-3-pl-con-brazo.png', mirrored: true },
  { id: 'two-three-seat-arm-right', label: '2 o 3 plazas con brazo derecho', source: '/assets/mod-2-3-pl-con-brazo.png' },
  { id: 'pouff', label: 'Pouff', source: '/assets/pouff.png' },
  { id: 'bed', label: 'Cama', source: '/assets/cama.png' },
  { id: 'bed-arm', label: 'Cama con un brazo', source: '/assets/cama-con-brazo.png' },
  { id: 'chaiselongue-left', label: 'Chaiselongue izquierda', source: '/assets/chaiselongue.png' },
  { id: 'chaiselongue-right', label: 'Chaiselongue derecha', source: '/assets/chaiselongue.png', mirrored: true },
  { id: 'one-seat-terminal-left', label: '1 plaza terminal izquierda', source: '/assets/mod-1-pl-terminal.png' },
  { id: 'one-seat-terminal-right', label: '1 plaza terminal derecha', source: '/assets/mod-1-pl-terminal.png', mirrored: true }
];

const moduleTypeOptions = [
  { id: 'sofa', label: 'Sofá', source: '/assets/sofa.png' },
  { id: 'armchair', label: 'Sillón', source: '/assets/sillon.png' },
  { id: 'one-seat-arm', label: '1 plaza con brazo', source: '/assets/mod-1-pl-con-brazo.png' },
  { id: 'one-seat-no-arm', label: '1 plaza sin brazo', source: '/assets/mod-1-pl-sin-brazo.png' },
  { id: 'two-three-seat-arm', label: '2–3 plazas con brazo', source: '/assets/mod-2-3-pl-con-brazo.png' },
  { id: 'bed', label: 'Cama', source: '/assets/cama.png' },
  { id: 'bed-arm', label: 'Cama con un brazo', source: '/assets/cama-con-brazo.png' },
  { id: 'chaiselongue', label: 'Chaiselongue', source: '/assets/chaiselongue.png' },
  { id: 'one-seat-terminal', label: '1 plaza terminal', source: '/assets/mod-1-pl-terminal.png' },
  { id: 'pouff', label: 'Pouff', source: '/assets/pouff.png' },
  { id: 'other', label: 'Otros módulos' }
];

const diagramFiltersByModuleType = {
  sofa: ['sofa'],
  armchair: ['armchair'],
  'one-seat-no-arm': ['one-seat-no-arm'],
  'one-seat-arm': ['one-seat-arm-left', 'one-seat-arm-right'],
  'two-three-seat-arm': ['two-three-seat-arm-left', 'two-three-seat-arm-right'],
  bed: ['bed'],
  'bed-arm': ['bed-arm'],
  chaiselongue: ['chaiselongue-left', 'chaiselongue-right'],
  'one-seat-terminal': ['one-seat-terminal-left', 'one-seat-terminal-right'],
  pouff: ['pouff']
};

function moduleDiagramFilterId(values) {
  const bed = bedDiagramType(values);
  if (bed) return bed;
  if (isSofa(values)) return 'sofa';
  if (isArmchair(values)) return 'armchair';
  if (isPouff(values)) return 'pouff';

  const rightArm = hasRightArm(values);
  if (isChaiselongue(values)) return rightArm ? 'chaiselongue-right' : 'chaiselongue-left';
  if (isOneSeatTerminal(values)) return rightArm ? 'one-seat-terminal-right' : 'one-seat-terminal-left';
  if (isOneSeatModuleWithoutArm(values)) return 'one-seat-no-arm';
  if (!isOneToThreeSeatModuleWithArm(values)) return null;

  const isOneSeat = /1\s*pl/.test(values.map(searchText).join(' '));
  const side = hasLeftArm(values) ? 'left' : 'right';
  return `${isOneSeat ? 'one-seat' : 'two-three-seat'}-arm-${side}`;
}

function moduleTypeFilterId(values) {
  const text = values.map(searchText).join(' ');
  const bed = bedDiagramType(values);
  if (bed) return bed;
  if (isSofa(values)) return 'sofa';
  if (isArmchair(values)) return 'armchair';
  if (isPouff(values)) return 'pouff';
  if (isChaiselongue(values)) return 'chaiselongue';
  if (isOneSeatTerminal(values)) return 'one-seat-terminal';
  if (isOneSeatModuleWithoutArm(values)) return 'one-seat-no-arm';
  if (isOneToThreeSeatModuleWithArm(values)) {
    return /1\s*pl/.test(text) ? 'one-seat-arm' : 'two-three-seat-arm';
  }
  if (/1\s*pl/.test(text)) return 'one-seat-no-arm';
  return 'other';
}

function hasModuleDiagram(values) {
  return Boolean(moduleDiagramFilterId(values));
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
  const bed = bedDiagramType(values);
  const text = values.map(searchText).join(' ');
  const sofa = isSofa(values);
  const armchair = isArmchair(values);
  const pouff = isPouff(values);
  const chaiselongue = isChaiselongue(values);
  const oneSeatTerminal = isOneSeatTerminal(values);
  const oneSeatNoArm = isOneSeatModuleWithoutArm(values);
  const leftArm = hasLeftArm(values);
  const rightArm = hasRightArm(values);
  const usesLeftBaseDiagram = chaiselongue || oneSeatTerminal || bed === 'bed-arm';
  const sideLabel = usesLeftBaseDiagram
    ? rightArm ? 'derecho' : 'izquierdo'
    : leftArm ? 'izquierdo' : 'derecho';
  const isOneSeat = /1\s*pl/.test(text);
  const source = bed === 'bed-arm'
    ? '/assets/cama-con-brazo.png'
    : bed === 'bed'
    ? '/assets/cama.png'
    : sofa
    ? '/assets/sofa.png'
    : armchair
    ? '/assets/sillon.png'
    : pouff
    ? '/assets/pouff.png'
    : chaiselongue
      ? '/assets/chaiselongue.png'
      : oneSeatTerminal
        ? '/assets/mod-1-pl-terminal.png'
      : oneSeatNoArm
        ? '/assets/mod-1-pl-sin-brazo.png'
      : isOneSeat
        ? '/assets/mod-1-pl-con-brazo.png'
        : '/assets/mod-2-3-pl-con-brazo.png';
  const label = bed === 'bed-arm'
    ? 'Cama con un brazo'
    : bed === 'bed'
    ? 'Cama'
    : sofa
    ? 'Sofá'
    : armchair
    ? 'Sillón'
    : pouff
    ? 'Pouff'
    : chaiselongue
      ? `Chaiselongue con brazo ${sideLabel}`
      : oneSeatTerminal
        ? `Módulo de 1 plaza terminal ${sideLabel}`
      : oneSeatNoArm
        ? 'Módulo de 1 plaza sin brazo'
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

function initialFabricIds(order) {
  return Object.fromEntries((order?.order_model_fabrics || [])
    .filter((assignment) => assignment.catalog_model_id && assignment.catalog_fabric_id)
    .map((assignment) => [assignment.catalog_model_id, assignment.catalog_fabric_id]));
}

function initialLinesForOrder(models, order, catalogFormat) {
  if (!order) return {};
  const lines = {};
  (order.order_lines || []).forEach((line) => {
    if (catalogFormat === 'items') {
      const model = models.find((item) => item.items?.some((catalogItem) => catalogItem.id === line.catalog_item_id));
      const item = model?.items.find((catalogItem) => catalogItem.id === line.catalog_item_id);
      if (!item) return;
      lines[item.id] = {
        itemId: item.id,
        catalogModelId: model.id,
        quantity: line.quantity,
        displayModel: model.name,
        displayName: item.code,
        displayDescription: item.description,
        displayDetails: itemDetails(item)
      };
      return;
    }
    const model = models.find((item) => item.modules?.some((module) => module.variants.some((variant) => variant.id === line.catalog_module_variant_id)));
    const module = model?.modules.find((catalogModule) => catalogModule.variants.some((variant) => variant.id === line.catalog_module_variant_id));
    const variant = module?.variants.find((catalogVariant) => catalogVariant.id === line.catalog_module_variant_id);
    if (!module || !variant) return;
    const key = `${module.id}:${variant.id}:${line.side || 'sin-lado'}`;
    lines[key] = {
      variantId: variant.id,
      catalogModelId: model.id,
      side: line.side || '',
      quantity: line.quantity,
      displayModel: model.name,
      displayName: module.name,
      displayDescription: variant.mechanism,
      displayDetails: line.side || ''
    };
  });
  return lines;
}

function initialComposition(lines) {
  let sequence = 0;
  return Object.entries(lines).flatMap(([key, line]) => Array.from(
    { length: line.quantity },
    () => ({ id: `${key}:initial-${++sequence}`, key })
  ));
}

export function nextFabricMatchIndex(currentIndex, key, totalMatches) {
  if (!totalMatches) return -1;
  if (key === 'ArrowDown') return Math.min(currentIndex + 1, totalMatches - 1);
  if (key === 'ArrowUp') return currentIndex < 0 ? totalMatches - 1 : Math.max(currentIndex - 1, 0);
  return currentIndex;
}

export default function NewOrderForm({ models, fabrics, customers, action, catalogFormat, initialOrder, submitLabel }) {
  const initialLines = useMemo(() => initialLinesForOrder(models, initialOrder, catalogFormat), [models, initialOrder, catalogFormat]);
  const initialModelId = initialOrder?.order_model_fabrics?.[0]?.catalog_model_id
    || Object.values(initialLines)[0]?.catalogModelId
    || models[0]?.id
    || '';
  const [modelId, setModelId] = useState(initialModelId);
  const [fabricIdsByModel, setFabricIdsByModel] = useState(() => initialFabricIds(initialOrder));
  const [fabricSearch, setFabricSearch] = useState('');
  const [activeFabricMatchIndex, setActiveFabricMatchIndex] = useState(-1);
  const [attachmentError, setAttachmentError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [moduleTypeFilter, setModuleTypeFilter] = useState('');
  const [mechanismFilter, setMechanismFilter] = useState('');
  const [diagramFilter, setDiagramFilter] = useState('');
  const [preview, setPreview] = useState(null);
  const [lines, setLines] = useState(initialLines);
  const [compositionOrder, setCompositionOrder] = useState(() => initialComposition(initialLines));
  const [draggedCompositionId, setDraggedCompositionId] = useState('');
  const [legacySelections, setLegacySelections] = useState({});
  const modelSelectRef = useRef(null);
  const customerSelectRef = useRef(null);
  const orderDateRef = useRef(null);
  const notesRef = useRef(null);
  const cartRef = useRef(null);
  const fabricSearchRef = useRef(null);
  const compositionSequenceRef = useRef(compositionOrder.length);
  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId),
    [models, modelId]
  );
  const selectedFabric = useMemo(
    () => fabrics.find((fabric) => fabric.id === fabricIdsByModel[modelId]),
    [fabrics, fabricIdsByModel, modelId]
  );
  const fabricMatches = useMemo(() => {
    return matchingFabrics(fabrics, fabricSearch);
  }, [fabrics, fabricSearch]);
  const activeFabricMatch = fabricMatches[activeFabricMatchIndex];

  useEffect(() => {
    if (!activeFabricMatch) return;
    document.getElementById(`fabric-option-${activeFabricMatch.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeFabricMatch]);
  const usesItems = catalogFormat === 'items';
  const catalogEntries = usesItems ? selectedModel?.items || [] : selectedModel?.modules || [];
  const visibleDiagramFilterOptions = moduleTypeFilter
    ? diagramFilterOptions.filter((option) => diagramFiltersByModuleType[moduleTypeFilter]?.includes(option.id))
    : diagramFilterOptions;
  const normalizedQuery = searchText(searchQuery.trim());
  const filteredEntries = catalogEntries.filter((entry) => {
    const searchable = usesItems
      ? [entry.code, entry.description, entry.categoryOption, entry.sideOption]
      : [entry.name, ...entry.variants.map((variant) => variant.mechanism)];
    const matchesText = !normalizedQuery || searchable.some((value) => searchText(value).includes(normalizedQuery));
    const matchesMaterial = !materialFilter
      || materialFilter === 'fabric' && isFabric(searchable)
      || materialFilter === 'leather' && isLeather(searchable);
    const matchesType = !moduleTypeFilter || moduleTypeFilterId(searchable) === moduleTypeFilter;
    const matchesMechanism = !mechanismFilter || mechanismFilterId(searchable) === mechanismFilter;
    const matchesDiagram = !diagramFilter || moduleDiagramFilterId(searchable) === diagramFilter;
    return matchesText && matchesMaterial && matchesType && matchesMechanism && matchesDiagram;
  });
  const cartEntries = Object.entries(lines).filter(([, line]) => line.quantity > 0);
  const totalUnits = cartEntries.reduce((sum, [, line]) => sum + line.quantity, 0);
  const requestedLines = cartEntries.map(([, line]) => (
    line.itemId
      ? { itemId: line.itemId, quantity: line.quantity }
      : { variantId: line.variantId, side: line.side, quantity: line.quantity }
  ));
  const modelFabricAssignments = useMemo(() => {
    const selectedModels = new Map();
    cartEntries.forEach(([, line]) => {
      if (line.catalogModelId) selectedModels.set(line.catalogModelId, line.displayModel);
    });
    return [...selectedModels].map(([catalogModelId]) => ({
      catalogModelId,
      catalogFabricId: fabricIdsByModel[catalogModelId] || ''
    }));
  }, [cartEntries, fabricIdsByModel]);
  const compositionByModel = useMemo(() => {
    const groups = new Map();
    compositionOrder.forEach((unit) => {
      const line = lines[unit.key];
      if (!line || line.quantity < 1) return;
      const modelId = line.catalogModelId || line.displayModel || 'modelo-sin-nombre';
      if (!groups.has(modelId)) groups.set(modelId, { id: modelId, name: line.displayModel || 'Modelo sin nombre', units: [] });
      groups.get(modelId).units.push({ ...unit, line });
    });
    return [...groups.values()];
  }, [compositionOrder, lines]);

  function changeModel(nextModelId) {
    setModelId(nextModelId);
    const selected = fabrics.find((fabric) => fabric.id === fabricIdsByModel[nextModelId]);
    setFabricSearch(selected ? `${selected.code} - ${selected.name} (${selected.type === 'P' ? 'Piel' : 'Tela'})` : '');
    setMaterialFilter(selected?.type === 'P' ? 'leather' : selected?.type === 'T' ? 'fabric' : '');
    setSearchQuery('');
    setModuleTypeFilter('');
    setMechanismFilter('');
    setDiagramFilter('');
  }

  function changeFabric(nextFabricId) {
    setFabricIdsByModel((previous) => ({ ...previous, [modelId]: nextFabricId }));
    const fabric = fabrics.find((item) => item.id === nextFabricId);
    setMaterialFilter(fabric?.type === 'P' ? 'leather' : fabric?.type === 'T' ? 'fabric' : '');
  }

  function selectFabric(fabric) {
    setFabricSearch(`${fabric.code} - ${fabric.name} (${fabric.type === 'P' ? 'Piel' : 'Tela'})`);
    changeFabric(fabric.id);
    setActiveFabricMatchIndex(-1);
  }

  function searchFabric(value) {
    setFabricSearch(value);
    setActiveFabricMatchIndex(-1);
    if (selectedFabric) {
      setFabricIdsByModel((previous) => ({ ...previous, [modelId]: '' }));
      setMaterialFilter('');
    }
  }

  function navigateFabricMatches(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveFabricMatchIndex((currentIndex) => nextFabricMatchIndex(currentIndex, event.key, fabricMatches.length));
      return;
    }
    if (event.key === 'Enter' && activeFabricMatch) {
      event.preventDefault();
      selectFabric(activeFabricMatch);
    }
  }

  function validateAttachment(event) {
    const file = event.target.files?.[0];
    if (!file) return setAttachmentError('');
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type) || file.size > 3 * 1024 * 1024) {
      event.target.value = '';
      setAttachmentError('El adjunto debe ser PDF, JPG, JPEG o PNG y no superar 3 MB.');
      return;
    }
    setAttachmentError('');
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
    setCompositionOrder((previous) => {
      if (amount > 0) {
        compositionSequenceRef.current += 1;
        return [...previous, { id: `${key}:${compositionSequenceRef.current}`, key }];
      }
      const lastIndex = previous.map((unit) => unit.key).lastIndexOf(key);
      return lastIndex < 0 ? previous : previous.filter((_, index) => index !== lastIndex);
    });
  }

  function reorderComposition(targetId) {
    setCompositionOrder((previous) => moveCompositionUnit(previous, draggedCompositionId, targetId));
    setDraggedCompositionId('');
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
      catalogModelId: selectedModel?.id || '',
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
      catalogModelId: selectedModel?.id || '',
      side: module.needsSide ? selection.side : '',
      quantity: 0,
      displayModel: selectedModel?.name || '',
      displayName: module.name,
      displayDescription: variant.mechanism,
      displayDetails: module.needsSide ? selection.side : ''
    });
  }

  function openOrderPreview() {
    const customer = customers.find((item) => item.id === customerSelectRef.current?.value);
    setPreview({
      customer: customer ? `${customer.client_code} - ${customer.trade_name}` : 'Sin seleccionar',
      orderDate: formatOrderDate(orderDateRef.current?.value),
      modelFabrics: modelFabricAssignments.map((assignment) => {
        const model = models.find((item) => item.id === assignment.catalogModelId);
        const fabric = fabrics.find((item) => item.id === assignment.catalogFabricId);
        return {
          model: model?.name || 'Modelo sin nombre',
          fabric: fabric ? `${fabric.code} - ${fabric.name} (${fabric.type === 'P' ? 'Piel' : 'Tela'})` : 'Sin seleccionar'
        };
      }),
      notes: notesRef.current?.value.trim() || 'Sin notas adicionales.',
      lines: cartEntries.map(([, line]) => ({
        code: line.displayName,
        description: line.displayDescription,
        details: line.displayDetails,
        model: line.displayModel,
        quantity: line.quantity
      }))
    });
  }

  return (
      <form action={action} className="order-form">
        {initialOrder ? <input type="hidden" name="orderId" value={initialOrder.id} /> : null}
        <div className="order-form-grid">
          <label className="order-customer-select">Cliente<select ref={customerSelectRef} name="customerId" defaultValue={initialOrder?.customer_id || ''} required><option value="" disabled>Selecciona un cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.client_code} - {customer.trade_name}</option>)}</select></label>
          <label>Fecha del pedido<input ref={orderDateRef} name="orderDate" type="date" defaultValue={initialOrder?.order_date || today()} required /></label>
        <label>Modelo<select ref={modelSelectRef} name="catalogModelId" value={modelId} onChange={(event) => changeModel(event.target.value)} required>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <div className="fabric-search-field"><label htmlFor="fabric-search">Tejido para {selectedModel?.name || 'este modelo'}</label><input ref={fabricSearchRef} id="fabric-search" value={fabricSearch} onChange={(event) => searchFabric(event.target.value)} onKeyDown={navigateFabricMatches} placeholder="Busca por código o nombre" autoComplete="off" role="combobox" aria-expanded={Boolean(fabricSearch.trim())} aria-controls="fabric-search-results" aria-activedescendant={activeFabricMatch ? `fabric-option-${activeFabricMatch.id}` : undefined} /><p className="fabric-search-hint">¿No encuentras el tejido? No selecciones ninguno e indícalo manualmente en las notas del pedido.</p>{selectedFabric ? <button className="fabric-search-clear" type="button" onClick={() => { setFabricIdsByModel((previous) => ({ ...previous, [modelId]: '' })); setFabricSearch(''); setActiveFabricMatchIndex(-1); setMaterialFilter(''); }}>Quitar selección</button> : null}{fabricSearch.trim() ? fabricMatches.length ? <div className="fabric-search-results" id="fabric-search-results" role="listbox">{fabricMatches.map((fabric, index) => <button className={index === activeFabricMatchIndex ? 'fabric-search-result-active' : ''} type="button" id={`fabric-option-${fabric.id}`} key={fabric.id} role="option" aria-selected={fabric.id === selectedFabric?.id} onClick={() => selectFabric(fabric)}><strong>{fabric.code}</strong><span>{fabric.name} · {fabric.type === 'P' ? 'Piel' : 'Tela'}</span></button>)}</div> : <p className="fabric-search-warning" role="status">No hay coincidencias para esta búsqueda.</p> : null}</div>
      </div>

      <section className="module-selection" aria-labelledby="catalog-selection-title">
        <div>
          <p className="eyebrow">CONFIGURACION</p>
          <h3 id="catalog-selection-title">{initialOrder ? `Edita el pedido #${initialOrder.order_number}` : 'Configura la modulación'}</h3>
          <p>Elige el tejido y responde estas preguntas para reducir el catálogo. Puedes cambiar los filtros siempre que necesites añadir otro módulo.</p>
        </div>

        <div className="module-selection-layout">
          <details className="order-catalog-details">
            <summary>
              {selectedModel?.name || 'Modelo'} - {catalogEntries.length} elementos disponibles
            </summary>
            <section className="catalog-guided-filters" aria-label="Filtros guiados del catálogo">
              <div className="catalog-filter-question">
                <p>1. Tapizado: {selectedFabric ? `${selectedFabric.name} (${selectedFabric.type === 'P' ? 'Piel' : 'Tela'})` : 'selecciona un tejido arriba'}</p>
                <div className="catalog-filter-buttons">
                  <button className={!materialFilter ? 'is-selected' : ''} type="button" onClick={() => setMaterialFilter('')} aria-pressed={!materialFilter}>Todos</button>
                  <button className={materialFilter === 'fabric' ? 'is-selected' : ''} type="button" onClick={() => setMaterialFilter('fabric')} aria-pressed={materialFilter === 'fabric'}>Tela</button>
                  <button className={materialFilter === 'leather' ? 'is-selected' : ''} type="button" onClick={() => setMaterialFilter('leather')} aria-pressed={materialFilter === 'leather'}>Piel</button>
                </div>
              </div>
              <div className="catalog-filter-question">
                <p>2. ¿Qué tipo de módulo buscas?</p>
                <div className="module-type-options">
                  <button className={!moduleTypeFilter ? 'is-selected' : ''} type="button" onClick={() => { setModuleTypeFilter(''); setDiagramFilter(''); }} aria-pressed={!moduleTypeFilter}>Ver todos</button>
                  {moduleTypeOptions.map((option) => (
                    <button className={moduleTypeFilter === option.id ? 'is-selected' : ''} type="button" key={option.id} onClick={() => { setModuleTypeFilter(option.id); setDiagramFilter(''); }} aria-pressed={moduleTypeFilter === option.id}>
                      {option.source ? <img className="module-seat-arm-diagram" src={option.source} alt="" /> : null}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="catalog-filter-question">
                <p>3. ¿Qué mecanismo necesitas?</p>
                <div className="catalog-filter-buttons">
                  <button className={!mechanismFilter ? 'is-selected' : ''} type="button" onClick={() => setMechanismFilter('')} aria-pressed={!mechanismFilter}>Todos</button>
                  <button className={mechanismFilter === 'fixed' ? 'is-selected' : ''} type="button" onClick={() => setMechanismFilter('fixed')} aria-pressed={mechanismFilter === 'fixed'}>Fijo</button>
                  <button className={mechanismFilter === 'relax' ? 'is-selected' : ''} type="button" onClick={() => setMechanismFilter('relax')} aria-pressed={mechanismFilter === 'relax'}>Relax</button>
                  <button className={mechanismFilter === 'sliding' ? 'is-selected' : ''} type="button" onClick={() => setMechanismFilter('sliding')} aria-pressed={mechanismFilter === 'sliding'}>Deslizante</button>
                </div>
              </div>
            </section>
            <label className="order-catalog-search">
              Buscar módulo o artículo
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Código, descripción u opción"
              />
            </label>
            {visibleDiagramFilterOptions.length ? (
              <fieldset className="diagram-filter-picker">
                <legend>¿Necesitas una orientación concreta? <span>Opcional</span></legend>
                <div className="diagram-filter-options">
                  {visibleDiagramFilterOptions.map((option) => (
                    <button className={`diagram-filter-option${diagramFilter === option.id ? ' is-selected' : ''}`} type="button" key={option.id} onClick={() => setDiagramFilter((current) => current === option.id ? '' : option.id)} aria-pressed={diagramFilter === option.id} title={option.label}>
                      <img className={option.mirrored ? 'module-seat-arm-diagram module-seat-arm-diagram-left' : 'module-seat-arm-diagram'} src={option.source} alt="" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {searchQuery || materialFilter || moduleTypeFilter || mechanismFilter || diagramFilter ? <p className="order-catalog-result-count">{filteredEntries.length} de {catalogEntries.length} elementos</p> : null}
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

          <aside className="order-cart" ref={cartRef} tabIndex="-1" aria-live="polite">
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
            {compositionByModel.length ? (
              <section className="cart-compositions" aria-label="Composición de módulos">
                <div><strong>Composición</strong><span>Arrastra los módulos para reordenarlos</span></div>
                {compositionByModel.map((group) => {
                  const fabric = fabrics.find((item) => item.id === fabricIdsByModel[group.id]);
                  return (
                  <section className="cart-composition-model" key={group.id} aria-label={`Composición del modelo ${group.name}`}>
                    <div className="cart-composition-model-heading"><h4>{group.name}</h4><button type="button" onClick={() => { changeModel(group.id); fabricSearchRef.current?.focus(); }}>Elegir tejido</button></div>
                    <p className="cart-model-fabric">Tejido: {fabric ? `${fabric.code} - ${fabric.name}` : 'Sin seleccionar'}</p>
                    <div className="cart-composition-row">
                      {group.units.map(({ id, line }) => {
                        const values = [line.displayName, line.displayDescription, line.displayDetails];
                        return (
                          <button
                            className="cart-composition-unit"
                            type="button"
                            key={id}
                            draggable
                            onDragStart={() => setDraggedCompositionId(id)}
                            onDragEnd={() => setDraggedCompositionId('')}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => reorderComposition(id)}
                            aria-label={`Reordenar ${line.displayName}`}
                            title="Arrastra para reordenar"
                          >
                            {hasModuleDiagram(values) ? <ModuleDiagram values={values} /> : <span className="cart-composition-fallback">{line.displayName}</span>}
                            <small>{line.displayName}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )})}
              </section>
            ) : null}
            <div className="cart-footer"><span>Total de unidades</span><strong>{totalUnits}</strong></div>
          </aside>
        </div>
        <div className="order-flow-actions">
          <button className="secondary-button" type="button" disabled={!cartEntries.length} onClick={openOrderPreview}>Ver resumen del pedido</button>
          <button className="secondary-button" type="button" onClick={() => { modelSelectRef.current?.focus(); modelSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>Añadir módulos de otro modelo</button>
        </div>
      </section>

      <label>Notas<textarea ref={notesRef} name="notes" maxLength="2000" rows="4" defaultValue={initialOrder?.notes || ''} /></label>
      <label className="order-attachment-field">Adjuntar documento <span>Opcional · PDF, JPG, JPEG o PNG · Máximo 3 MB</span>{initialOrder?.order_attachments?.length ? <small>Los adjuntos actuales se conservarán y el nuevo archivo se añadirá.</small> : null}<input name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={validateAttachment} />{attachmentError ? <small role="alert">{attachmentError}</small> : null}</label>
      <input type="hidden" name="lines" value={JSON.stringify(requestedLines)} />
      <input type="hidden" name="modelFabricAssignments" value={JSON.stringify(modelFabricAssignments)} />
      <SubmitOrderButton disabled={!cartEntries.length} label={submitLabel} />
      {preview ? (
        <div className="order-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section className="order-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="order-preview-title">
            <div className="order-preview-heading">
              <div><p className="eyebrow">VISTA PREVIA</p><h3 id="order-preview-title">Pedido para Departamento de pedidos</h3></div>
              <button type="button" className="order-preview-close" onClick={() => setPreview(null)} aria-label="Cerrar resumen">×</button>
            </div>
            <div className="order-preview-meta">
              <div><strong>Cliente</strong><span>{preview.customer}</span></div>
              <div><strong>Fecha solicitada</strong><span>{preview.orderDate}</span></div>
              <div><strong>Modelos</strong><span>{preview.modelFabrics.map((item) => item.model).join(', ') || 'Sin seleccionar'}</span></div>
              <div><strong>Tejidos</strong><span>{preview.modelFabrics.map((item) => `${item.model}: ${item.fabric}`).join(' · ') || 'Sin seleccionar'}</span></div>
            </div>
            <div className="order-preview-lines"><strong>Artículos solicitados</strong>{preview.lines.map((line, index) => <article key={`${line.code}-${index}`}><div><b>{line.code}</b><span>{line.model}{line.description ? ` - ${line.description}` : ''}{line.details ? ` - ${line.details}` : ''}</span></div><em>×{line.quantity}</em></article>)}</div>
            <div className="order-preview-notes"><strong>Notas</strong><p>{preview.notes}</p></div>
            <div className="order-preview-footer"><span>Total de unidades: <b>{totalUnits}</b></span><button type="button" className="secondary-button" onClick={() => setPreview(null)}>Seguir editando</button></div>
          </section>
        </div>
      ) : null}
    </form>
  );
}
