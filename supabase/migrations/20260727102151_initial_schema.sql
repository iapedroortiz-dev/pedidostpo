create schema if not exists private;

create type public.app_role as enum ('admin', 'pedidos', 'representante');
create type public.order_status as enum ('pendiente', 'confirmado', 'en_fabricacion');
create type public.catalog_status as enum ('borrador', 'publicado', 'archivado');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'representante',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  status public.catalog_status not null default 'borrador',
  created_by uuid references public.profiles(id) on delete restrict,
  published_by uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_versions_publication_check check (
    (status = 'publicado' and published_at is not null)
    or status <> 'publicado'
  )
);

create table public.catalog_imports (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references public.catalog_versions(id) on delete cascade,
  original_filename text not null,
  storage_path text not null unique,
  checksum_sha256 text,
  uploaded_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.catalog_models (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references public.catalog_versions(id) on delete cascade,
  name text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_version_id, display_order)
);

create table public.catalog_modules (
  id uuid primary key default gen_random_uuid(),
  catalog_model_id uuid not null references public.catalog_models(id) on delete cascade,
  name text not null,
  needs_side boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_model_id, display_order)
);

create table public.catalog_module_variants (
  id uuid primary key default gen_random_uuid(),
  catalog_module_id uuid not null references public.catalog_modules(id) on delete cascade,
  mechanism text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_module_id, display_order)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  representative_id uuid not null references public.profiles(id) on delete restrict,
  catalog_version_id uuid references public.catalog_versions(id) on delete restrict,
  catalog_model_id uuid references public.catalog_models(id) on delete restrict,
  model_name text not null,
  client_code text not null,
  client_name text not null,
  order_date date not null,
  notes text,
  status public.order_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  line_number integer not null,
  catalog_module_variant_id uuid references public.catalog_module_variants(id) on delete restrict,
  module_name text not null,
  mechanism text not null,
  side text check (side in ('izquierda', 'derecha') or side is null),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_number)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
order_id uuid,  action text not null,
  entity_type text not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index orders_representative_id_idx on public.orders(representative_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index order_lines_order_id_idx on public.order_lines(order_id);
create index catalog_models_version_id_idx on public.catalog_models(catalog_version_id);
create index catalog_modules_model_id_idx on public.catalog_modules(catalog_model_id);
create index catalog_variants_module_id_idx on public.catalog_module_variants(catalog_module_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select public.current_app_role()) = 'admin'::public.app_role;
$$;

create or replace function public.is_pedidos_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select public.current_app_role()) in (
    'admin'::public.app_role,
    'pedidos'::public.app_role
  );
$$;

create or replace function public.change_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.order_status;
  v_role public.app_role;
  v_order public.orders;
begin
  v_role := public.current_app_role();

  if v_role not in ('admin'::public.app_role, 'pedidos'::public.app_role) then
    raise exception 'No tienes permiso para cambiar el estado de un pedido.';
  end if;

  select status
  into v_current_status
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Pedido no encontrado.';
  end if;

  if not (
    (v_current_status = 'pendiente' and p_new_status = 'confirmado')
    or
    (v_current_status = 'confirmado' and p_new_status = 'en_fabricacion')
  ) then
    raise exception 'Transición de estado no permitida.';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.write_order_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if tg_op = 'INSERT' then
    v_order_id := (
      to_jsonb(new) ->> case
        when tg_table_name = 'orders' then 'id'
        else 'order_id'
      end
    )::uuid;

    insert into public.audit_events (
      actor_id, order_id, action, entity_type, new_data
    )
    values (
      auth.uid(), v_order_id, tg_op, tg_table_name, to_jsonb(new)
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_order_id := (
      to_jsonb(new) ->> case
        when tg_table_name = 'orders' then 'id'
        else 'order_id'
      end
    )::uuid;

    insert into public.audit_events (
      actor_id, order_id, action, entity_type, previous_data, new_data
    )
    values (
      auth.uid(), v_order_id, tg_op, tg_table_name, to_jsonb(old), to_jsonb(new)
    );

    return new;
  end if;

  v_order_id := (
    to_jsonb(old) ->> case
      when tg_table_name = 'orders' then 'id'
      else 'order_id'
    end
  )::uuid;

  insert into public.audit_events (
    actor_id, order_id, action, entity_type, previous_data
  )
  values (
    auth.uid(), v_order_id, tg_op, tg_table_name, to_jsonb(old)
  );

  return old;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger catalog_versions_set_updated_at
before update on public.catalog_versions
for each row execute function public.set_updated_at();

create trigger catalog_models_set_updated_at
before update on public.catalog_models
for each row execute function public.set_updated_at();

create trigger catalog_modules_set_updated_at
before update on public.catalog_modules
for each row execute function public.set_updated_at();

create trigger catalog_module_variants_set_updated_at
before update on public.catalog_module_variants
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_lines_set_updated_at
before update on public.order_lines
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger orders_audit
after insert or update or delete on public.orders
for each row execute function public.write_order_audit_event();

create trigger order_lines_audit
after insert or update or delete on public.order_lines
for each row execute function public.write_order_audit_event();

alter table public.profiles enable row level security;
alter table public.catalog_versions enable row level security;
alter table public.catalog_imports enable row level security;
alter table public.catalog_models enable row level security;
alter table public.catalog_modules enable row level security;
alter table public.catalog_module_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.audit_events enable row level security;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_pedidos_or_admin() from public;
revoke all on function public.change_order_status(uuid, public.order_status) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_pedidos_or_admin() to authenticated;
grant execute on function public.change_order_status(uuid, public.order_status) to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant select on public.profiles to authenticated;

grant select on public.catalog_versions to authenticated;
grant select, insert, update on public.catalog_imports to authenticated;
grant select, insert, update on public.catalog_models to authenticated;
grant select, insert, update on public.catalog_modules to authenticated;
grant select, insert, update on public.catalog_module_variants to authenticated;

grant select, insert, update on public.orders to authenticated;
grant select, insert, update on public.order_lines to authenticated;

grant select on public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

create policy catalog_versions_select_authenticated
on public.catalog_versions
for select
to authenticated
using ((select public.current_app_role()) is not null);

create policy catalog_versions_admin_all
on public.catalog_versions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy catalog_imports_admin_all
on public.catalog_imports
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy catalog_models_select_published_or_admin
on public.catalog_models
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.catalog_versions cv
    where cv.id = catalog_models.catalog_version_id
      and cv.status = 'publicado'
      and (select public.current_app_role()) is not null
  )
);

create policy catalog_models_admin_all
on public.catalog_models
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy catalog_modules_select_published_or_admin
on public.catalog_modules
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.catalog_models cm
    join public.catalog_versions cv on cv.id = cm.catalog_version_id
    where cm.id = catalog_modules.catalog_model_id
      and cv.status = 'publicado'
      and (select public.current_app_role()) is not null
  )
);

create policy catalog_modules_admin_all
on public.catalog_modules
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy catalog_variants_select_published_or_admin
on public.catalog_module_variants
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.catalog_modules cmo
    join public.catalog_models cm on cm.id = cmo.catalog_model_id
    join public.catalog_versions cv on cv.id = cm.catalog_version_id
    where cmo.id = catalog_module_variants.catalog_module_id
      and cv.status = 'publicado'
      and (select public.current_app_role()) is not null
  )
);

create policy catalog_variants_admin_all
on public.catalog_module_variants
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy orders_select_own_or_operational
on public.orders
for select
to authenticated
using (
  representative_id = (select auth.uid())
  or (select public.is_pedidos_or_admin())
);

create policy orders_insert_representative_pending_or_admin
on public.orders
for insert
to authenticated
with check (
  (
    (select public.current_app_role()) = 'representante'::public.app_role
    and representative_id = (select auth.uid())
    and status = 'pendiente'::public.order_status
  )
  or (select public.is_admin())
);

create policy orders_update_own_pending
on public.orders
for update
to authenticated
using (
  representative_id = (select auth.uid())
  and status = 'pendiente'::public.order_status
)
with check (
  representative_id = (select auth.uid())
  and status = 'pendiente'::public.order_status
);

create policy orders_admin_update
on public.orders
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy order_lines_select_with_visible_order
on public.order_lines
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_lines.order_id
  )
);

create policy order_lines_insert_own_pending_or_admin
on public.order_lines
for insert
to authenticated
with check (
  (select public.is_admin())
  or exists (
    select 1
    from public.orders o
    where o.id = order_lines.order_id
      and o.representative_id = (select auth.uid())
      and o.status = 'pendiente'::public.order_status
  )
);

create policy order_lines_update_own_pending_or_admin
on public.order_lines
for update
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.orders o
    where o.id = order_lines.order_id
      and o.representative_id = (select auth.uid())
      and o.status = 'pendiente'::public.order_status
  )
)
with check (
  (select public.is_admin())
  or exists (
    select 1
    from public.orders o
    where o.id = order_lines.order_id
      and o.representative_id = (select auth.uid())
      and o.status = 'pendiente'::public.order_status
  )
);

create policy audit_events_select_admin
on public.audit_events
for select
to authenticated
using ((select public.is_admin()));