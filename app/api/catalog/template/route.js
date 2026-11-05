import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { CatalogDownloadError, requireActiveAdmin } from '../../../../lib/catalog-export';
import { EXCEL_MIME, templateWorkbookData, workbookBuffer } from '../../../../lib/catalog-workbook';

function workbookResponse(buffer, filename) {
  return new NextResponse(buffer, { headers: {
    'Content-Type': EXCEL_MIME,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

export async function GET() {
  try {
    const supabase = await createClient();
    await requireActiveAdmin(supabase);
    return workbookResponse(await workbookBuffer(templateWorkbookData()), 'plantilla-catalogo-pedidos.xlsx');
  } catch (error) {
    const status = error instanceof CatalogDownloadError ? error.status : 500;
    return NextResponse.json({ error: error instanceof CatalogDownloadError ? error.message : 'No se pudo generar la plantilla.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
