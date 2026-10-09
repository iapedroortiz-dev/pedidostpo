alter type public.order_status add value if not exists 'gestionado';

update public.orders
set status = 'gestionado'
where status in ('confirmado', 'en_fabricacion', 'servido');

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

  if not (v_current_status = 'pendiente' and p_new_status = 'gestionado') then
    raise exception 'Transición de estado no permitida.';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;
