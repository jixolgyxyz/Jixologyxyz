-- Atomic coin deduction. Fails with an exception if the user has insufficient
-- funds, so the caller can surface a friendly error without a race condition.
create or replace function public.deduct_coins(p_user_id int, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuario
  set dinero = dinero - p_amount
  where id = p_user_id and dinero >= p_amount;

  if not found then
    raise exception 'Saldo insuficiente';
  end if;
end;
$$;
