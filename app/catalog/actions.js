'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';

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

export async function deleteCatalogVersion(formData) {
  const catalogVersionId = String(formData.get('catalogVersionId') || '');
  if (!catalogVersionId) {
    redirect('/catalog?error=Versión%20de%20catálogo%20no%20válida.');
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();
  if (!profile?.active || profile.role !== 'admin') {
    redirect('/catalog?error=No%20tienes%20permiso%20para%20eliminar%20tarifas.');
  }

  const admin = createAdminClient();
  const { data: version, error: versionError } = await admin
    .from('catalog_versions')
    .select('id, status')
    .eq('id', catalogVersionId)
    .maybeSingle();
  if (versionError || !version) {
    redirect('/catalog?error=La%20versión%20de%20catálogo%20no%20existe.');
  }
  if (version.status === 'publicado') {
    redirect('/catalog?error=No%20se%20puede%20eliminar%20la%20tarifa%20publicada.');
  }

  const { count: orderCount, error: ordersError } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('catalog_version_id', catalogVersionId);
  if (ordersError) throw ordersError;
  if (orderCount) {
    redirect('/catalog?error=No%20se%20puede%20eliminar%20una%20tarifa%20con%20pedidos%20históricos.');
  }

  const { data: imports, error: importsError } = await admin
    .from('catalog_imports')
    .select('storage_path')
    .eq('catalog_version_id', catalogVersionId);
  if (importsError) throw importsError;

  const { error: deleteError } = await admin
    .from('catalog_versions')
    .delete()
    .eq('id', catalogVersionId);
  if (deleteError) {
    console.error('Error eliminando catálogo:', deleteError);
    redirect('/catalog?error=No%20se%20pudo%20eliminar%20la%20tarifa.');
  }

  const storagePaths = (imports || []).map((item) => item.storage_path).filter(Boolean);
  if (storagePaths.length) {
    const { error: storageError } = await admin.storage
      .from('catalog-source')
      .remove(storagePaths);
    if (storageError) console.error('No se pudo eliminar el Excel privado:', storageError);
  }

  revalidatePath('/catalog');
  redirect('/catalog?message=Tarifa%20eliminada%20correctamente.');
}
