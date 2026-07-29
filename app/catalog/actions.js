'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export async function publishCatalogVersion(formData) {
  const catalogVersionId = String(formData.get('catalogVersionId') || '');

  if (!catalogVersionId) {
    redirect('/catalog?error=Versión%20de%20catálogo%20no%20válida.');
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect('/login');
  }

  const { error } = await supabase.rpc('publish_catalog_version', {
    p_catalog_version_id: catalogVersionId
  });

  if (error) {
    console.error('Error publicando catálogo:', error);
    redirect('/catalog?error=No%20se%20pudo%20publicar%20el%20catálogo.');
  }

  revalidatePath('/catalog');
  redirect('/catalog?message=Catálogo%20publicado%20correctamente.');
}