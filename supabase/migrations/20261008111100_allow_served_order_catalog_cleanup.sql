alter table public.orders
  drop constraint if exists orders_catalog_version_id_fkey,
  add constraint orders_catalog_version_id_fkey
    foreign key (catalog_version_id) references public.catalog_versions(id) on delete set null,
  drop constraint if exists orders_catalog_model_id_fkey,
  add constraint orders_catalog_model_id_fkey
    foreign key (catalog_model_id) references public.catalog_models(id) on delete set null,
  drop constraint if exists orders_catalog_fabric_id_fkey,
  add constraint orders_catalog_fabric_id_fkey
    foreign key (catalog_fabric_id) references public.catalog_fabrics(id) on delete set null;

alter table public.order_lines
  drop constraint if exists order_lines_catalog_item_id_fkey,
  add constraint order_lines_catalog_item_id_fkey
    foreign key (catalog_item_id) references public.catalog_items(id) on delete set null;

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

  select status into v_current_status
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Pedido no encontrado.';
  end if;

  if not (
    (v_current_status = 'pendiente' and p_new_status = 'confirmado')
    or (v_current_status = 'confirmado' and p_new_status = 'en_fabricacion')
    or (v_current_status = 'en_fabricacion' and p_new_status = 'servido')
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
