drop policy if exists order_drafts_select_own on public.order_drafts;
drop policy if exists order_drafts_insert_own on public.order_drafts;
drop policy if exists order_drafts_update_own on public.order_drafts;
drop policy if exists order_drafts_delete_own on public.order_drafts;

create policy order_drafts_select_own
on public.order_drafts
for select
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) in ('representante'::public.app_role, 'admin'::public.app_role)
);

create policy order_drafts_insert_own
on public.order_drafts
for insert
to authenticated
with check (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) in ('representante'::public.app_role, 'admin'::public.app_role)
);

create policy order_drafts_update_own
on public.order_drafts
for update
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) in ('representante'::public.app_role, 'admin'::public.app_role)
)
with check (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) in ('representante'::public.app_role, 'admin'::public.app_role)
);

create policy order_drafts_delete_own
on public.order_drafts
for delete
to authenticated
using (
  representative_id = (select auth.uid())
  and (select public.current_app_role()) in ('representante'::public.app_role, 'admin'::public.app_role)
);
