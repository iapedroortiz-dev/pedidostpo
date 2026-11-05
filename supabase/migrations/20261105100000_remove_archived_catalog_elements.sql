alter table public.order_lines
  drop constraint if exists order_lines_catalog_module_variant_id_fkey,
  add constraint order_lines_catalog_module_variant_id_fkey
    foreign key (catalog_module_variant_id) references public.catalog_module_variants(id) on delete set null;

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
  v_previous_catalog_version_id uuid;
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

  select id
  into v_previous_catalog_version_id
  from public.catalog_versions
  where status = 'publicado'::public.catalog_status
  for update;

  update public.catalog_versions
  set status = 'archivado'::public.catalog_status
  where id = v_previous_catalog_version_id;

  update public.catalog_versions
  set
    status = 'publicado'::public.catalog_status,
    published_by = (select auth.uid()),
    published_at = now()
  where id = p_catalog_version_id
  returning * into v_catalog_version;

  if v_previous_catalog_version_id is not null then
    delete from public.catalog_items old_item
    using public.catalog_models old_model
    where old_item.catalog_model_id = old_model.id
      and old_model.catalog_version_id = v_previous_catalog_version_id
      and not exists (
        select 1
        from public.catalog_models new_model
        join public.catalog_items new_item on new_item.catalog_model_id = new_model.id
        where new_model.catalog_version_id = p_catalog_version_id
          and lower(trim(new_model.name)) = lower(trim(old_model.name))
          and new_item.code = old_item.code
      );

    delete from public.catalog_models old_model
    where old_model.catalog_version_id = v_previous_catalog_version_id
      and not exists (
        select 1
        from public.catalog_models new_model
        where new_model.catalog_version_id = p_catalog_version_id
          and lower(trim(new_model.name)) = lower(trim(old_model.name))
      )
      and not exists (
        select 1
        from public.catalog_items old_item
        where old_item.catalog_model_id = old_model.id
      );
  end if;

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
