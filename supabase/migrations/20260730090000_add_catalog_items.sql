create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_model_id uuid not null references public.catalog_models(id) on delete cascade,
  code text not null,
  description text not null,
  category_option text,
  side_option text,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_model_id, display_order),
  unique (catalog_model_id, code)
);

create index catalog_items_model_id_idx
on public.catalog_items (catalog_model_id);

alter table public.order_lines
add column catalog_item_id uuid references public.catalog_items(id) on delete restrict,
add column catalog_item_code text;

create index order_lines_catalog_item_id_idx
on public.order_lines (catalog_item_id);

create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

alter table public.catalog_items enable row level security;

grant select, insert, update on public.catalog_items to authenticated;

create policy catalog_items_select_published_or_admin
on public.catalog_items
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.catalog_models cm
    join public.catalog_versions cv on cv.id = cm.catalog_version_id
    where cm.id = catalog_items.catalog_model_id
      and cv.status = 'publicado'
      and (select public.current_app_role()) is not null
  )
);

create policy catalog_items_admin_all
on public.catalog_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
