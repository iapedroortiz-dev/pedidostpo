insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalog-source',
  'catalog-source',
  false,
  5242880,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy "catalog_source_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'catalog-source'
  and (select public.is_admin())
);

create policy "catalog_source_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalog-source'
  and (select public.is_admin())
);

create policy "catalog_source_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalog-source'
  and (select public.is_admin())
)
with check (
  bucket_id = 'catalog-source'
  and (select public.is_admin())
);

create policy "catalog_source_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalog-source'
  and (select public.is_admin())
);