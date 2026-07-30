'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const allowedSides = new Set(['izquierda', 'derecha']);

function redirectWithError(message) {
  redirect(`/pedidos?error=${encodeURIComponent(message)}`);
}

function normalizedSide(value) {
  const normalized = String(value || '')
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!normalized) return null;
  if (normalized === 'izquierda' || normalized === 'izquierdo') return 'izquierda';
  if (normalized === 'derecha' || normalized === 'derecho') return 'derecha';
  return undefined;
}

async function currentUserProfile(supabase) {
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();
  if (!profile?.active) redirect('/login?error=Usuario%20sin%20acceso%20activo.');

  return { userId, profile };
}

function parseRequestedLines(formData) {
  let lines;
  try {
    lines = JSON.parse(String(formData.get('lines') || '[]'));
  } catch {
    redirectWithError('La seleccion de elementos no es valida.');
  }

  if (!Array.isArray(lines) || !lines.length || lines.length > 100) {
    redirectWithError('Anade al menos un elemento al pedido.');
  }
  return lines;
}

async function catalogLinesFromItems(supabase, catalogModelId, requestedLines) {
  const itemIds = [
    ...new Set(requestedLines.map((line) => String(line?.itemId || '')).filter(Boolean))
  ];
  if (itemIds.length !== requestedLines.length) {
    redirectWithError('No repitas elementos en el mismo pedido.');
  }

  const { data: items } = await supabase
    .from('catalog_items')
    .select('id, code, description, category_option, side_option')
    .eq('catalog_model_id', catalogModelId)
    .in('id', itemIds);
  const itemById = new Map((items || []).map((item) => [item.id, item]));

  return requestedLines.map((line, index) => {
    const item = itemById.get(String(line?.itemId || ''));
    const quantity = Number(line?.quantity);
    const side = item ? normalizedSide(item.side_option) : undefined;

    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      redirectWithError('Uno de los elementos seleccionados no es valido.');
    }
    if (side === undefined) {
      redirectWithError(`El elemento ${item.code} tiene una opcion de lado no valida.`);
    }

    return {
      line_number: index + 1,
      catalog_item_id: item.id,
      catalog_item_code: item.code,
      module_name: item.description,
      mechanism: item.category_option || 'Sin categoria',
      side,
      quantity
    };
  });
}

async function catalogLinesFromLegacy(supabase, catalogModelId, requestedLines) {
  const variantIds = [
    ...new Set(requestedLines.map((line) => String(line?.variantId || '')).filter(Boolean))
  ];
  if (variantIds.length !== requestedLines.length) {
    redirectWithError('No repitas modulos en el mismo pedido.');
  }

  const { data: modules } = await supabase
    .from('catalog_modules')
    .select('id, name, needs_side')
    .eq('catalog_model_id', catalogModelId);
  const moduleById = new Map((modules || []).map((module) => [module.id, module]));
  const { data: variants } = await supabase
    .from('catalog_module_variants')
    .select('id, catalog_module_id, mechanism')
    .in('id', variantIds);
  const variantById = new Map((variants || []).map((variant) => [variant.id, variant]));

  return requestedLines.map((line, index) => {
    const variant = variantById.get(String(line?.variantId || ''));
    const module = variant && moduleById.get(variant.catalog_module_id);
    const quantity = Number(line?.quantity);
    const requestedSide = String(line?.side || '').toLowerCase();

    if (!variant || !module || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      redirectWithError('Uno de los modulos seleccionados no es valido.');
    }
    if (module.needs_side && !allowedSides.has(requestedSide)) {
      redirectWithError('Indica izquierda o derecha para los modulos que lo requieren.');
    }

    return {
      line_number: index + 1,
      catalog_module_variant_id: variant.id,
      module_name: module.name,
      mechanism: variant.mechanism,
      side: module.needs_side ? requestedSide : null,
      quantity
    };
  });
}

export async function createOrder(formData) {
  const supabase = await createClient();
  const { userId, profile } = await currentUserProfile(supabase);
  if (!['representante', 'admin'].includes(profile.role)) {
    redirectWithError('No tienes permiso para crear pedidos.');
  }

  const clientCode = String(formData.get('clientCode') || '').trim();
  const clientName = String(formData.get('clientName') || '').trim();
  const orderDate = String(formData.get('orderDate') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const catalogModelId = String(formData.get('catalogModelId') || '').trim();
  if (!clientCode || !clientName || !/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
    redirectWithError('Completa el codigo, cliente y fecha del pedido.');
  }
  if (!catalogModelId || notes.length > 2000) {
    redirectWithError('Los datos del pedido no son validos.');
  }
  const requestedLines = parseRequestedLines(formData);

  const { data: publishedVersion } = await supabase
    .from('catalog_versions')
    .select('id')
    .eq('status', 'publicado')
    .maybeSingle();
  if (!publishedVersion) redirectWithError('No hay un catalogo publicado disponible.');

  const { data: catalogModel } = await supabase
    .from('catalog_models')
    .select('id, name')
    .eq('id', catalogModelId)
    .eq('catalog_version_id', publishedVersion.id)
    .maybeSingle();
  if (!catalogModel) {
    redirectWithError('El modelo seleccionado ya no pertenece al catalogo publicado.');
  }

  const usesItems = requestedLines.every((line) => String(line?.itemId || '').trim());
  const usesLegacy = requestedLines.every((line) => String(line?.variantId || '').trim());
  if (!usesItems && !usesLegacy) {
    redirectWithError('La seleccion mezcla formatos de catalogo no validos.');
  }
  const lines = usesItems
    ? await catalogLinesFromItems(supabase, catalogModel.id, requestedLines)
    : await catalogLinesFromLegacy(supabase, catalogModel.id, requestedLines);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      representative_id: userId,
      catalog_version_id: publishedVersion.id,
      catalog_model_id: catalogModel.id,
      model_name: catalogModel.name,
      client_code: clientCode,
      client_name: clientName,
      order_date: orderDate,
      notes: notes || null,
      status: 'pendiente'
    })
    .select('id, order_number')
    .single();
  if (orderError || !order) {
    console.error('Error creando pedido:', orderError);
    redirectWithError('No se pudo crear el pedido. Intentalo de nuevo.');
  }

  const { error: linesError } = await supabase
    .from('order_lines')
    .insert(lines.map((line) => ({ ...line, order_id: order.id })));
  if (linesError) {
    console.error('Error creando lineas del pedido:', linesError);
    redirectWithError('El pedido no se pudo completar. Contacta con administracion.');
  }

  revalidatePath('/pedidos');
  redirect(`/pedidos?message=${encodeURIComponent(`Pedido #${order.order_number} creado correctamente.`)}`);
}

export async function advanceOrderStatus(formData) {
  const orderId = String(formData.get('orderId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!orderId || !['confirmado', 'en_fabricacion'].includes(status)) {
    redirectWithError('El cambio de estado no es valido.');
  }

  const supabase = await createClient();
  const { profile } = await currentUserProfile(supabase);
  if (!['admin', 'pedidos'].includes(profile.role)) {
    redirectWithError('No tienes permiso para gestionar pedidos.');
  }

  const { error } = await supabase.rpc('change_order_status', {
    p_order_id: orderId,
    p_new_status: status
  });
  if (error) {
    console.error('Error actualizando el estado del pedido:', error);
    redirectWithError('No se pudo actualizar el estado del pedido.');
  }

  revalidatePath('/pedidos');
  redirect('/pedidos?message=Estado%20del%20pedido%20actualizado.');
}
