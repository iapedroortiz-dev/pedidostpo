insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-attachments',
  'order-attachments',
  false,
  3145728,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create table public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 255),
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 3145728),
  created_at timestamptz not null default now()
);

create index order_attachments_order_id_idx on public.order_attachments(order_id);

alter table public.order_attachments enable row level security;

grant select on public.order_attachments to authenticated;

create policy order_attachments_select_visible_order
on public.order_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_attachments.order_id
      and (
        o.representative_id = (select auth.uid())
        or (select public.is_pedidos_or_admin())
      )
  )
);
