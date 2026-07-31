create table public.customers (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique,
  trade_name text not null,
  representative_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_representative_id_idx
on public.customers (representative_id);

alter table public.orders
add column customer_id uuid references public.customers(id) on delete restrict;

create index orders_customer_id_idx
on public.orders (customer_id);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

grant select on public.customers to authenticated;

create policy customers_select_assigned_or_operational
on public.customers
for select
to authenticated
using (
  representative_id = (select auth.uid())
  or (select public.is_pedidos_or_admin())
);
