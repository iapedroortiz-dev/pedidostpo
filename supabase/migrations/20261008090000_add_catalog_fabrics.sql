create table public.catalog_fabrics (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references public.catalog_versions(id) on delete cascade,
  code text not null,
  name text not null,
  fabric_type char(1) not null check (fabric_type in ('P', 'T')),
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_version_id, code),
  unique (catalog_version_id, display_order)
);

create index catalog_fabrics_version_id_idx
on public.catalog_fabrics (catalog_version_id);

create trigger catalog_fabrics_set_updated_at
before update on public.catalog_fabrics
for each row execute function public.set_updated_at();

alter table public.catalog_fabrics enable row level security;

grant select, insert, update on public.catalog_fabrics to authenticated;

create policy catalog_fabrics_select_published_or_admin
on public.catalog_fabrics
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.catalog_versions cv
    where cv.id = catalog_fabrics.catalog_version_id
      and cv.status = 'publicado'
      and (select public.current_app_role()) is not null
  )
);

create policy catalog_fabrics_admin_all
on public.catalog_fabrics
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

alter table public.orders
  add column catalog_fabric_id uuid references public.catalog_fabrics(id) on delete restrict,
  add column fabric_code text,
  add column fabric_name text,
  add column fabric_type char(1) check (fabric_type in ('P', 'T') or fabric_type is null);

create index orders_catalog_fabric_id_idx
on public.orders (catalog_fabric_id);
