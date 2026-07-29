'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

const allowedSides = new Set(['izquierda', 'derecha']);

function redirectWithError(message) {
  redirect(`/pedidos?error=${encodeURIComponent(message)}`);
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
    redirectWithError('Completa el código, cliente y fecha del pedido.');
  }

  if (!catalogModelId || notes.length > 2000) {
    redirectWithError('Los datos del pedido no son válidos.');
  }

  let requestedLines;
  try {
    requestedLines = JSON.parse(String(formData.get('lines') || '[]'));
  } catch {
    redirectWithError('La selección de módulos no es válida.');
  }

  if (!Array.isArray(requestedLines) || !requestedLines.length || requestedLines.length > 100) {
    redirectWithError('Añade al menos un módulo al pedido.');
  }

  const { data: publishedVersion } = await supabase
    .from('catalog_versions')
    .select('id')
    .eq('status', 'publicado')
    .maybeSingle();

  if (!publishedVersion) redirectWithError('No hay un catálogo publicado disponible.');

  const { data: catalogModel } = await supabase
    .from('catalog_models')
    .select('id, name')
    .eq('id', catalogModelId)
    .eq('catalog_version_id', publishedVersion.id)
    .maybeSingle();

  if (!catalogModel) {
    redirectWithError('El modelo seleccionado ya no pertenece al catálogo publicado.');
  }

  const variantIds = [...new Set(requestedLines.map((line) => String(line?.variantId || '')))].filter(Boolean);
  if (variantIds.length !== requestedLines.length) {
    redirectWithError('No repitas módulos en el mismo pedido.');
  }

  const { data: modules } = await supabase
    .from('catalog_modules')
    .select('id, name, needs_side')
    .eq('catalog_model_id', catalogModel.id);
  const moduleById = new Map((modules || []).map((module) => [module.id, module]));

  const { data: variants } = await supabase
    .from('catalog_module_variants')
    .select('id, catalog_module_id, mechanism')
    .in('id', variantIds);
  const variantById = new Map((variants || []).map((variant) => [variant.id, variant]));

  const lines = requestedLines.map((line, index) => {
    const variant = variantById.get(String(line?.variantId || ''));
    const module = variant && moduleById.get(variant.catalog_module_id);
    const quantity = Number(line?.quantity);
    const requestedSide = String(line?.side || '').toLowerCase();

    if (!variant || !module || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      redirectWithError('Uno de los módulos seleccionados no es válido.');
    }
    if (module.needs_side && !allowedSides.has(requestedSide)) {
      redirectWithError('Indica izquierda o derecha para los módulos que lo requieren.');
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
    redirectWithError('No se pudo crear el pedido. Inténtalo de nuevo.');
  }

  const { error: linesError } = await supabase
    .from('order_lines')
    .insert(lines.map((line) => ({ ...line, order_id: order.id })));

  if (linesError) {
    console.error('Error creando líneas del pedido:', linesError);
    redirectWithError('El pedido no se pudo completar. Contacta con administración.');
  }

  revalidatePath('/pedidos');
  redirect(`/pedidos?message=${encodeURIComponent(`Pedido #${order.order_number} creado correctamente.`)}`);
}

export async function advanceOrderStatus(formData) {
  const orderId = String(formData.get('orderId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!orderId || !['confirmado', 'en_fabricacion'].includes(status)) {
    redirectWithError('El cambio de estado no es válido.');
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
