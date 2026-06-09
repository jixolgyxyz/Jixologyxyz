-- Trigger function: awards coins to id_usuario_responsable when a backlog
-- item's status transitions INTO "Acabado".
-- Base fee: 20 coins.
-- Multiplier starts at 1.0 and shifts ±0.1 per day relative to fecha_vencimiento:
--   early  → +0.1 per day, capped at 2.0  (10+ days early  = 2x = 40 coins)
--   on time → 1.0                          (exactly on date  = 1x = 20 coins)
--   late   → -0.1 per day, floored at 0.0 (10+ days late   = 0x =  0 coins)
-- Result is rounded up (ceiling) to the nearest integer.
-- If fecha_vencimiento is null the flat 20 coins are awarded.
create or replace function public.award_coins_on_acabado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days_diff int;
  v_mult      numeric;
  v_coins     int;
begin
  if NEW.id_estatus <> OLD.id_estatus
     and NEW.id_usuario_responsable is not null
     and exists (
       select 1 from public.estatus_backlog_item
       where id = NEW.id_estatus and nombre = 'Acabado'
     )
     and not exists (
       select 1 from public.estatus_backlog_item
       where id = OLD.id_estatus and nombre = 'Acabado'
     )
  then
    if NEW.fecha_vencimiento is null then
      v_mult := 1.0;
    else
      v_days_diff := current_date - NEW.fecha_vencimiento::date;
      v_mult := greatest(0.0, least(2.0, 1.0 - v_days_diff * 0.1));
    end if;

    v_coins := ceil(20 * v_mult)::int;

    update public.usuario
    set dinero = dinero + v_coins
    where id = NEW.id_usuario_responsable;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_coins_on_acabado on public.backlog_item;
create trigger trg_award_coins_on_acabado
after update on public.backlog_item
for each row
execute function public.award_coins_on_acabado();