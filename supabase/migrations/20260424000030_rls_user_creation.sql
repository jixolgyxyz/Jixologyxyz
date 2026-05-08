alter table public.usuario
add column if not exists activo boolean not null default true;

update public.usuario
set activo = true
where activo is null;

create index if not exists idx_usuario_activo
on public.usuario (activo);

create or replace function public.current_global_role()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select u.id_rol_global
  from public.usuario u
  where u.auth_id = auth.uid()
  limit 1;
$$;

alter table public.rol_global enable row level security;
alter table public.zona_horaria enable row level security;

drop policy if exists "zona_horaria_select_authenticated" on public.zona_horaria;
create policy "zona_horaria_select_authenticated"
on public.zona_horaria
for select
to authenticated
using (true);

drop policy if exists "rol_global_select_superadmin_all" on public.rol_global;
create policy "rol_global_select_superadmin_all"
on public.rol_global
for select
to authenticated
using (public.current_global_role() = 1);

drop policy if exists "rol_global_select_admin_limited" on public.rol_global;
create policy "rol_global_select_admin_limited"
on public.rol_global
for select
to authenticated
using (
  public.current_global_role() = 2
  and id in (3, 4)
);


alter table public.usuario enable row level security;

drop policy if exists "usuario_select_own" on public.usuario;
create policy "usuario_select_own"
on public.usuario
for select
to authenticated
using (
  auth_id = auth.uid()
);

drop policy if exists "usuario_update_own" on public.usuario;
create policy "usuario_update_own"
on public.usuario
for update
to authenticated
using (
  auth_id = auth.uid()
  and activo = true
)
with check (
  auth_id = auth.uid()
  and activo = true
);



drop policy if exists "usuario_select_admin_all" on public.usuario;
create policy "usuario_select_admin_all"
on public.usuario
for select
to authenticated
using (
  public.current_global_role() in (1, 2)
);

drop policy if exists "usuario_update_admin_all" on public.usuario;
create policy "usuario_update_admin_all"
on public.usuario
for update
to authenticated
using (
  public.current_global_role() in (1, 2)
)
with check (
  public.current_global_role() in (1, 2)
);

create or replace function public.prevent_forbidden_self_profile_changes()
returns trigger
language plpgsql
as $$
begin
  if old.auth_id = auth.uid() then
    if new.id_rol_global is distinct from old.id_rol_global then
      raise exception 'No puedes cambiar tu propio rol global.';
    end if;

    if new.email is distinct from old.email then
      raise exception 'No puedes cambiar tu propio correo directamente.';
    end if;

    if new.nombre is distinct from old.nombre then
      raise exception 'No puedes cambiar tu propio nombre.';
    end if;

    if new.apellido is distinct from old.apellido then
      raise exception 'No puedes cambiar tu propio apellido.';
    end if;

    if new.telefono is distinct from old.telefono then
      raise exception 'No puedes cambiar tu propio teléfono.';
    end if;

    if new.fecha_nacimiento is distinct from old.fecha_nacimiento then
      raise exception 'No puedes cambiar tu propia fecha de nacimiento.';
    end if;

    if new.auth_id is distinct from old.auth_id then
      raise exception 'No puedes cambiar tu auth_id.';
    end if;

    if new.activo is distinct from old.activo then
      raise exception 'No puedes cambiar tu propio estado activo.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_forbidden_self_profile_changes on public.usuario;

create trigger trg_prevent_forbidden_self_profile_changes
before update on public.usuario
for each row
execute function public.prevent_forbidden_self_profile_changes();
