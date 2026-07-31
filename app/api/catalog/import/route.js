import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';

const { catalogAndCustomersFromBuffer } = require('../../../../lib/catalog');

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function catalogLabelFromFileName(fileName) {
  return fileName
    .replace(/\.xlsx$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export async function POST(request) {
  let admin;
  let storagePath;
  let catalogVersionId;

  try {
    const caller = await createServerClient();
    const { data: claimsData } = await caller.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return errorResponse('Debes iniciar sesión.', 401);
    }

    const { data: profile } = await caller
      .from('profiles')
      .select('role, active')
      .eq('id', userId)
      .single();

    if (!profile?.active || profile.role !== 'admin') {
      return errorResponse('No tienes permiso para importar el catálogo.', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (
      !file ||
      typeof file === 'string' ||
      typeof file.arrayBuffer !== 'function'
    ) {
      return errorResponse('Selecciona un archivo Excel.');
    }

    const originalFileName = String(file.name || '').trim();

    if (!originalFileName.toLowerCase().endsWith('.xlsx')) {
      return errorResponse('Solo se permiten archivos .xlsx.');
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse('El archivo debe tener entre 1 byte y 5 MB.');
    }

    if (file.type && file.type !== XLSX_MIME) {
      return errorResponse('El archivo no tiene un tipo Excel válido.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const catalog = await catalogAndCustomersFromBuffer(buffer, originalFileName);

    if (!catalog.models?.length) {
      return errorResponse('El Excel no contiene modelos válidos.');
    }

    const requestedLabel = String(formData.get('label') || '').trim();
    const label = (requestedLabel || catalogLabelFromFileName(originalFileName))
      .slice(0, 120);

    if (!label) {
      return errorResponse('Indica un nombre para esta versión del catálogo.');
    }

    admin = createAdminClient();

    const representativeEmails = [
      ...new Set(
        catalog.customers
          .map((customer) => customer.representativeEmail)
          .filter(Boolean)
      )
    ];
    const { data: representatives, error: representativesError } = representativeEmails.length
      ? await admin
          .from('profiles')
          .select('id, email')
          .in('email', representativeEmails)
      : { data: [], error: null };
    if (representativesError) throw representativesError;

    const representativeByEmail = new Map(
      (representatives || []).map((representative) => [
        String(representative.email || '').toLocaleLowerCase('es-ES'),
        representative.id
      ])
    );
    const unknownEmails = representativeEmails.filter(
      (email) => !representativeByEmail.has(email)
    );
    if (unknownEmails.length) {
      return errorResponse(
        `No existe un usuario para: ${unknownEmails.slice(0, 3).join(', ')}${unknownEmails.length > 3 ? '...' : ''}.`,
        422
      );
    }

    const { data: existingVersion } = await admin
      .from('catalog_versions')
      .select('id')
      .eq('label', label)
      .maybeSingle();

    if (existingVersion) {
      return errorResponse(
        'Ya existe una versión de catálogo con ese nombre.',
        409
      );
    }

    const { error: customersError } = await admin
      .from('customers')
      .upsert(
        catalog.customers.map((customer) => ({
          client_code: customer.clientCode,
          trade_name: customer.tradeName,
          representative_id: customer.representativeEmail
            ? representativeByEmail.get(customer.representativeEmail)
            : null,
          active: true
        })),
        { onConflict: 'client_code' }
      );
    if (customersError) throw customersError;

    storagePath = `imports/${new Date().toISOString().slice(0, 10)}/${
      crypto.randomUUID()
    }-${safeFileName(originalFileName)}`;

    const { error: uploadError } = await admin.storage
      .from('catalog-source')
      .upload(storagePath, buffer, {
        contentType: XLSX_MIME,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: version, error: versionError } = await admin
      .from('catalog_versions')
      .insert({
        label,
        status: 'borrador',
        created_by: userId
      })
      .select('id')
      .single();

    if (versionError) {
      throw versionError;
    }

    catalogVersionId = version.id;

    const { error: importError } = await admin
      .from('catalog_imports')
      .insert({
        catalog_version_id: catalogVersionId,
        original_filename: originalFileName,
        storage_path: storagePath,
        uploaded_by: userId
      });

    if (importError) {
      throw importError;
    }

    for (const [modelIndex, model] of catalog.models.entries()) {
      const { data: savedModel, error: modelError } = await admin
        .from('catalog_models')
        .insert({
          catalog_version_id: catalogVersionId,
          name: model.name,
          display_order: modelIndex + 1
        })
        .select('id')
        .single();

      if (modelError) {
        throw modelError;
      }

      for (const [itemIndex, item] of model.items.entries()) {
        const { error: itemError } = await admin
          .from('catalog_items')
          .insert({
            catalog_model_id: savedModel.id,
            code: item.code,
            description: item.description,
            category_option: item.categoryOption,
            side_option: item.sideOption,
            display_order: itemIndex + 1
          });

        if (itemError) {
          throw itemError;
        }
      }
    }

    await admin.from('audit_events').insert({
      actor_id: userId,
      action: 'IMPORT',
      entity_type: 'catalog_version',
      new_data: {
        catalog_version_id: catalogVersionId,
        label,
        source_file: originalFileName,
        model_count: catalog.models.length,
        customer_count: catalog.customers.length,
        item_count: catalog.models.reduce(
          (total, model) => total + model.items.length,
          0
        )
      }
    });

    return NextResponse.json(
      {
        id: catalogVersionId,
        label,
        status: 'borrador',
        modelCount: catalog.models.length,
        customerCount: catalog.customers.length,
        itemCount: catalog.models.reduce(
          (total, model) => total + model.items.length,
          0
        )
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importando catálogo:', error);

    if (admin && catalogVersionId) {
      await admin.from('catalog_versions').delete().eq('id', catalogVersionId);
    }

    if (admin && storagePath) {
      await admin.storage.from('catalog-source').remove([storagePath]);
    }

    return errorResponse('No se pudo importar el catálogo. Revisa el Excel e inténtalo de nuevo.', 500);
  }
}
