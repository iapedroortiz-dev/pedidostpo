create table public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references public.profiles(id) on delete cascade,
  catalog_version_id uuid references public.catalog_versions(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_drafts_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index order_drafts_representative_updated_at_idx
on public.order_drafts (representative_id, updated_at desc);

create trigger set_order_drafts_updated_at
before update on public.order_drafts
for each row execute function public.set_updated_at();

alter table public.order_drafts enable row level security;

grant select, insert, update, delete on public.order_drafts to authenticated;

create policy order_drafts_select_own
on public.order_drafts
for select
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) = 'representante'::public.app_role
);

create policy order_drafts_insert_own
on public.order_drafts
for insert
to authenticated
with check (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) = 'representante'::public.app_role
);

create policy order_drafts_update_own
on public.order_drafts
for update
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) = 'representante'::public.app_role
)
with check (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) = 'representante'::public.app_role
);

create policy order_drafts_delete_own
on public.order_drafts
for delete
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) = 'representante'::public.app_role
);
