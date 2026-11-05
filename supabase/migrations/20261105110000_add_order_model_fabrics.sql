create table public.order_model_fabrics (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  catalog_model_id uuid references public.catalog_models(id) on delete set null,
  model_name text not null,
  catalog_fabric_id uuid references public.catalog_fabrics(id) on delete set null,
  fabric_code text,
  fabric_name text,
  fabric_type char(1) check (fabric_type in ('P', 'T') or fabric_type is null),
  created_at timestamptz not null default now(),
  unique (order_id, catalog_model_id)
);

create index order_model_fabrics_order_id_idx
on public.order_model_fabrics (order_id);

alter table public.order_model_fabrics enable row level security;

grant select, insert on public.order_model_fabrics to authenticated;

create policy order_model_fabrics_select_own_or_operational
on public.order_model_fabrics
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_model_fabrics.order_id
      and (
        orders.representative_id = (select auth.uid())
        or (select public.is_pedidos_or_admin())
      )
  )
);

create policy order_model_fabrics_insert_own_or_admin
on public.order_model_fabrics
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    join public.catalog_models on catalog_models.id = order_model_fabrics.catalog_model_id
    where orders.id = order_model_fabrics.order_id
      and orders.catalog_version_id = catalog_models.catalog_version_id
      and orders.status = 'pendiente'
      and catalog_models.name = order_model_fabrics.model_name
      and (
        orders.representative_id = (select auth.uid())
        or (select public.is_admin())
      )
  )
  and exists (
    select 1
    from public.order_lines
    left join public.catalog_items on catalog_items.id = order_lines.catalog_item_id
    left join public.catalog_module_variants on catalog_module_variants.id = order_lines.catalog_module_variant_id
    left join public.catalog_modules on catalog_modules.id = catalog_module_variants.catalog_module_id
    where order_lines.order_id = order_model_fabrics.order_id
      and (
        catalog_items.catalog_model_id = order_model_fabrics.catalog_model_id
        or catalog_modules.catalog_model_id = order_model_fabrics.catalog_model_id
      )
  )
  and (
    (
      order_model_fabrics.catalog_fabric_id is null
      and order_model_fabrics.fabric_code is null
      and order_model_fabrics.fabric_name is null
      and order_model_fabrics.fabric_type is null
    )
    or exists (
      select 1
      from public.catalog_fabrics
      join public.orders on orders.id = order_model_fabrics.order_id
      where catalog_fabrics.id = order_model_fabrics.catalog_fabric_id
        and catalog_fabrics.catalog_version_id = orders.catalog_version_id
        and catalog_fabrics.code = order_model_fabrics.fabric_code
        and catalog_fabrics.name = order_model_fabrics.fabric_name
        and catalog_fabrics.fabric_type = order_model_fabrics.fabric_type
    )
  )
);

create trigger order_model_fabrics_audit
after insert or update or delete on public.order_model_fabrics
for each row execute function public.write_order_audit_event();
