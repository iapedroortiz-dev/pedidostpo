grant delete on public.order_lines to authenticated;
grant delete on public.order_model_fabrics to authenticated;

create policy order_lines_delete_own_pending_or_admin
on public.order_lines
for delete
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
);

create policy order_model_fabrics_delete_own_pending_or_admin
on public.order_model_fabrics
for delete
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.orders o
    where o.id = order_model_fabrics.order_id
      and o.representative_id = (select auth.uid())
      and o.status = 'pendiente'::public.order_status
  )
);

create or replace function public.replace_pending_order(
  p_order_id uuid,
  p_catalog_version_id uuid,
  p_catalog_model_id uuid,
  p_model_name text,
  p_customer_id uuid,
  p_client_code text,
  p_client_name text,
  p_order_date date,
  p_notes text,
  p_lines jsonb,
  p_model_fabrics jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if (select public.current_app_role()) <> 'representante'::public.app_role then
    raise exception 'No tienes permiso para editar pedidos.';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = p_order_id
      and representative_id = (select auth.uid())
      and status = 'pendiente'::public.order_status
  ) then
    raise exception 'Solo puedes editar tus pedidos pendientes.';
  end if;

  update public.orders
  set
    catalog_version_id = p_catalog_version_id,
    catalog_model_id = p_catalog_model_id,
    model_name = p_model_name,
    catalog_fabric_id = null,
    fabric_code = null,
    fabric_name = null,
    fabric_type = null,
    customer_id = p_customer_id,
    client_code = p_client_code,
    client_name = p_client_name,
    order_date = p_order_date,
    notes = p_notes
  where id = p_order_id;

  delete from public.order_model_fabrics where order_id = p_order_id;
  delete from public.order_lines where order_id = p_order_id;

  insert into public.order_lines (
    order_id, line_number, catalog_item_id, catalog_module_variant_id,
    catalog_item_code, module_name, mechanism, side, quantity
  )
  select
    p_order_id, line_number, catalog_item_id, catalog_module_variant_id,
    catalog_item_code, module_name, mechanism, side, quantity
  from jsonb_to_recordset(p_lines) as line(
    line_number integer,
    catalog_item_id uuid,
    catalog_module_variant_id uuid,
    catalog_item_code text,
    module_name text,
    mechanism text,
    side text,
    quantity integer
  );

  insert into public.order_model_fabrics (
    order_id, catalog_model_id, model_name, catalog_fabric_id,
    fabric_code, fabric_name, fabric_type
  )
  select
    p_order_id, catalog_model_id, model_name, catalog_fabric_id,
    fabric_code, fabric_name, fabric_type
  from jsonb_to_recordset(p_model_fabrics) as fabric(
    catalog_model_id uuid,
    model_name text,
    catalog_fabric_id uuid,
    fabric_code text,
    fabric_name text,
    fabric_type char(1)
  );
end;
$$;

revoke all on function public.replace_pending_order(uuid, uuid, uuid, text, uuid, text, text, date, text, jsonb, jsonb) from public;
grant execute on function public.replace_pending_order(uuid, uuid, uuid, text, uuid, text, text, date, text, jsonb, jsonb) to authenticated;
