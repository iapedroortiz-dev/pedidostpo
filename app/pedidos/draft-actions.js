'use server';

import { createClient } from '../../lib/supabase/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validSides = new Set(['', 'izquierda', 'derecha']);

function optionalUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!uuidPattern.test(normalized)) throw new Error('El borrador contiene datos no válidos.');
  return normalized;
}

function optionalDate(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error('El borrador contiene una fecha no válida.');
  return normalized;
}

function optionalText(value, maximum) {
  const normalized = String(value || '').trim();
  if (normalized.length > maximum) throw new Error('El borrador contiene texto demasiado largo.');
  return normalized;
}

function draftLines(value) {
  if (!Array.isArray(value) || value.length > 100) throw new Error('El borrador contiene demasiadas líneas.');

  return value.map((line) => {
    const itemId = optionalUuid(line?.itemId);
    const variantId = optionalUuid(line?.variantId);
    const quantity = Number(line?.quantity);
    const side = String(line?.side || '').trim().toLowerCase();
    if (Boolean(itemId) === Boolean(variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999 || !validSides.has(side)) {
      throw new Error('El borrador contiene una línea no válida.');
    }
    return itemId
      ? { itemId, quantity }
      : { variantId, side, quantity };
  });
}

function draftFabricIds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El borrador contiene tejidos no válidos.');
  const entries = Object.entries(value);
  if (entries.length > 50) throw new Error('El borrador contiene demasiados tejidos.');
  return Object.fromEntries(entries.map(([modelId, fabricId]) => {
    const normalizedModelId = optionalUuid(modelId);
    if (!normalizedModelId) throw new Error('El borrador contiene un modelo no válido.');
    return [normalizedModelId, optionalUuid(fabricId) || ''];
  }));
}

function safeDraftPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El borrador no es válido.');

  const payload = {
    customerId: optionalUuid(value.customerId) || '',
    orderDate: optionalDate(value.orderDate),
    notes: optionalText(value.notes, 2000),
    modelId: optionalUuid(value.modelId) || '',
    fabricIdsByModel: draftFabricIds(value.fabricIdsByModel || {}),
    lines: draftLines(value.lines || [])
  };
  if (JSON.stringify(payload).length > 30000) throw new Error('El borrador es demasiado grande.');
  return payload;
}

export async function saveOrderDraft({ draftId, catalogVersionId, payload }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error('Tu sesión ha caducado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();
  if (!profile?.active || !['representante', 'admin'].includes(profile.role)) {
    throw new Error('No tienes permiso para guardar borradores.');
  }

  const id = optionalUuid(draftId);
  if (!id) throw new Error('No se pudo identificar el borrador.');
  const selectedCatalogVersionId = optionalUuid(catalogVersionId);
  if (!selectedCatalogVersionId) throw new Error('No se pudo identificar el catálogo del borrador.');

  const { data: existingDraft } = await supabase
    .from('order_drafts')
    .select('catalog_version_id')
    .eq('id', id)
    .maybeSingle();
  if (existingDraft && existingDraft.catalog_version_id !== selectedCatalogVersionId) {
    throw new Error('El catálogo del borrador no se puede cambiar.');
  }
  if (!existingDraft) {
    const { data: publishedCatalog } = await supabase
      .from('catalog_versions')
      .select('id')
      .eq('id', selectedCatalogVersionId)
      .eq('status', 'publicado')
      .maybeSingle();
    if (!publishedCatalog) throw new Error('El catálogo publicado ya no está disponible.');
  }

  const values = {
    catalog_version_id: selectedCatalogVersionId,
    payload: safeDraftPayload(payload)
  };

  const { data: draft, error } = await supabase
    .from('order_drafts')
    .upsert({ ...values, id, representative_id: userId }, { onConflict: 'id' })
    .select('id, updated_at')
    .single();
  if (error || !draft) {
    console.error('Error guardando borrador:', error);
    throw new Error('No se pudo guardar el borrador.');
  }
  return draft;
}
