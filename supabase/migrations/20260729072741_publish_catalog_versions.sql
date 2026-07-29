create unique index catalog_versions_one_published_idx
on public.catalog_versions (status)
where status = 'publicado'::public.catalog_status;

create or replace function public.publish_catalog_version(
  p_catalog_version_id uuid
)
returns public.catalog_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog_version public.catalog_versions;
begin
  if (select public.current_app_role()) <> 'admin'::public.app_role then
    raise exception 'No tienes permiso para publicar catálogos.';
  end if;

  select *
  into v_catalog_version
  from public.catalog_versions
  where id = p_catalog_version_id
  for update;

  if not found then
    raise exception 'La versión de catálogo no existe.';
  end if;

  if v_catalog_version.status = 'archivado'::public.catalog_status then
    raise exception 'No se puede publicar una versión archivada.';
  end if;

  if v_catalog_version.status = 'publicado'::public.catalog_status then
    return v_catalog_version;
  end if;

  update public.catalog_versions
  set status = 'archivado'::public.catalog_status
  where status = 'publicado'::public.catalog_status;

  update public.catalog_versions
  set
    status = 'publicado'::public.catalog_status,
    published_by = (select auth.uid()),
    published_at = now()
  where id = p_catalog_version_id
  returning * into v_catalog_version;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    new_data
  )
  values (
    (select auth.uid()),
    'PUBLISH',
    'catalog_version',
    jsonb_build_object(
      'catalog_version_id', v_catalog_version.id,
      'label', v_catalog_version.label
    )
  );

  return v_catalog_version;
end;
$$;

revoke all on function public.publish_catalog_version(uuid) from public;
grant execute on function public.publish_catalog_version(uuid) to authenticated;