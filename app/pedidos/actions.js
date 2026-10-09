'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { sendNewOrderEmail } from '../../lib/order-notification';

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
    .select('role, active, full_name, email')
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

async function catalogLinesFromItems(supabase, catalogVersionId, requestedLines) {
  const itemIds = [
    ...new Set(requestedLines.map((line) => String(line?.itemId || '')).filter(Boolean))
  ];
  if (itemIds.length !== requestedLines.length) {
    redirectWithError('No repitas elementos en el mismo pedido.');
  }

  const { data: items } = await supabase
    .from('catalog_items')
    .select('id, catalog_model_id, code, description, category_option, side_option')
    .in('id', itemIds);
  const itemById = new Map((items || []).map((item) => [item.id, item]));
  const modelIds = [...new Set((items || []).map((item) => item.catalog_model_id))];
  const { data: models } = await supabase
    .from('catalog_models')
    .select('id, name')
    .eq('catalog_version_id', catalogVersionId)
    .in('id', modelIds);
  const modelById = new Map((models || []).map((model) => [model.id, model]));

  const lines = requestedLines.map((line, index) => {
    const item = itemById.get(String(line?.itemId || ''));
    const itemModel = item && modelById.get(item.catalog_model_id);
    const quantity = Number(line?.quantity);
    const side = item ? normalizedSide(item.side_option) : undefined;

    if (!item || !itemModel || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
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

  const orderedModelNames = [];
  for (const line of requestedLines) {
    const item = itemById.get(String(line?.itemId || ''));
    const modelName = item && modelById.get(item.catalog_model_id)?.name;
    if (modelName && !orderedModelNames.includes(modelName)) orderedModelNames.push(modelName);
  }

  return { lines, modelIds, modelNames: orderedModelNames };
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

  const customerId = String(formData.get('customerId') || '').trim();
  const orderDate = String(formData.get('orderDate') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const catalogModelId = String(formData.get('catalogModelId') || '').trim();
  const catalogFabricId = String(formData.get('catalogFabricId') || '').trim();
  if (!customerId || !/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
    redirectWithError('Completa el cliente y la fecha del pedido.');
  }
  if (!catalogModelId || !catalogFabricId || notes.length > 2000) {
    redirectWithError('Los datos del pedido no son validos.');
  }
  const requestedLines = parseRequestedLines(formData);

  const { data: customer } = await supabase
    .from('customers')
    .select('id, client_code, trade_name')
    .eq('id', customerId)
    .eq('active', true)
    .maybeSingle();
  if (!customer) {
    redirectWithError('El cliente seleccionado no esta disponible para tu usuario.');
  }

  const { data: publishedVersion } = await supabase
    .from('catalog_versions')
    .select('id')
    .eq('status', 'publicado')
    .maybeSingle();
  if (!publishedVersion) redirectWithError('No hay un catalogo publicado disponible.');

  const { data: fabric } = await supabase
    .from('catalog_fabrics')
    .select('id, code, name, fabric_type')
    .eq('id', catalogFabricId)
    .eq('catalog_version_id', publishedVersion.id)
    .maybeSingle();
  if (!fabric) {
    redirectWithError('Selecciona un tejido válido del catálogo publicado.');
  }

  const usesItems = requestedLines.every((line) => String(line?.itemId || '').trim());
  const usesLegacy = requestedLines.every((line) => String(line?.variantId || '').trim());
  if (!usesItems && !usesLegacy) {
    redirectWithError('La seleccion mezcla formatos de catalogo no validos.');
  }
  let lines;
  let orderModelId;
  let orderModelName;

  if (usesItems) {
    const itemResult = await catalogLinesFromItems(supabase, publishedVersion.id, requestedLines);
    lines = itemResult.lines;
    orderModelId = itemResult.modelIds.length === 1 ? itemResult.modelIds[0] : null;
    orderModelName = itemResult.modelNames.join(' + ');
  } else {
    const { data: catalogModel } = await supabase
      .from('catalog_models')
      .select('id, name')
      .eq('id', catalogModelId)
      .eq('catalog_version_id', publishedVersion.id)
      .maybeSingle();
    if (!catalogModel) {
      redirectWithError('El modelo seleccionado ya no pertenece al catalogo publicado.');
    }
    lines = await catalogLinesFromLegacy(supabase, catalogModel.id, requestedLines);
    orderModelId = catalogModel.id;
    orderModelName = catalogModel.name;
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      representative_id: userId,
      catalog_version_id: publishedVersion.id,
      catalog_model_id: orderModelId,
      model_name: orderModelName,
      catalog_fabric_id: fabric.id,
      fabric_code: fabric.code,
      fabric_name: fabric.name,
      fabric_type: fabric.fabric_type,
      customer_id: customer.id,
      client_code: customer.client_code,
      client_name: customer.trade_name,
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

  let emailNotice = '';
  try {
    const emailResult = await sendNewOrderEmail({
      admin: createAdminClient(),
      order: { ...order, order_date: orderDate, model_name: orderModelName, notes },
      customer,
      fabric,
      lines,
      representative: profile
    });
    if (!emailResult.sent) {
      console.warn('Aviso de pedido no enviado:', emailResult.reason);
      emailNotice = ' El aviso por email está pendiente de configuración.';
    }
  } catch (emailError) {
    console.error('No se pudo enviar el aviso de nuevo pedido:', emailError);
    emailNotice = ' El pedido se ha registrado, pero no se pudo enviar el aviso por email.';
  }

  revalidatePath('/pedidos');
  redirect(`/pedidos?message=${encodeURIComponent(`Pedido #${order.order_number} creado correctamente.${emailNotice}`)}`);
}

export async function advanceOrderStatus(formData) {
  const orderId = String(formData.get('orderId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!orderId || !['confirmado', 'en_fabricacion', 'servido'].includes(status)) {
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
