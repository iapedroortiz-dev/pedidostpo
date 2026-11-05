import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { CatalogDownloadError, activeCatalogWorkbookFor, exportFilename, requireActiveAdmin } from '../../../../lib/catalog-export';
import { EXCEL_MIME, workbookBuffer } from '../../../../lib/catalog-workbook';

export async function GET() {
  try {
    const supabase = await createClient();
    await requireActiveAdmin(supabase);
    const workbook = await activeCatalogWorkbookFor(supabase);
    return new NextResponse(await workbookBuffer(workbook), { headers: {
      'Content-Type': EXCEL_MIME,
        'Content-Disposition': `attachment; filename="${exportFilename(workbook.label)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const status = error instanceof CatalogDownloadError ? error.status : 500;
    return NextResponse.json({ error: error instanceof CatalogDownloadError ? error.message : 'No se pudo exportar el catálogo.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
