-- Helper: returns true if the current user is a member of the given project
create or replace function public.is_project_member(p_id_proyecto int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuario_proyecto up
    join public.usuario u on u.id = up.id_usuario
    where u.auth_id = auth.uid()
    and up.id_proyecto = p_id_proyecto
  );
$$;

-- Helper: returns the internal usuario.id for the current auth session
create or replace function public.current_usuario_id()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuario where auth_id = auth.uid() limit 1;
$$;

-- ============================================================
-- CATALOG TABLES — read-only for all authenticated users
-- ============================================================

alter table public.avatar_style enable row level security;
drop policy if exists "avatar_style_select_authenticated" on public.avatar_style;
create policy "avatar_style_select_authenticated"
on public.avatar_style for select to authenticated using (true);

alter table public.atributo_avatar enable row level security;
drop policy if exists "atributo_avatar_select_authenticated" on public.atributo_avatar;
create policy "atributo_avatar_select_authenticated"
on public.atributo_avatar for select to authenticated using (true);

alter table public.elemento_inventario_avatar enable row level security;
drop policy if exists "elemento_inventario_avatar_select_authenticated" on public.elemento_inventario_avatar;
create policy "elemento_inventario_avatar_select_authenticated"
on public.elemento_inventario_avatar for select to authenticated using (true);

alter table public.estatus_backlog_item enable row level security;
drop policy if exists "estatus_backlog_item_select_authenticated" on public.estatus_backlog_item;
create policy "estatus_backlog_item_select_authenticated"
on public.estatus_backlog_item for select to authenticated using (true);

alter table public.prioridad_backlog_item enable row level security;
drop policy if exists "prioridad_backlog_item_select_authenticated" on public.prioridad_backlog_item;
create policy "prioridad_backlog_item_select_authenticated"
on public.prioridad_backlog_item for select to authenticated using (true);

alter table public.tipo_backlog_item enable row level security;
drop policy if exists "tipo_backlog_item_select_authenticated" on public.tipo_backlog_item;
create policy "tipo_backlog_item_select_authenticated"
on public.tipo_backlog_item for select to authenticated using (true);

-- ============================================================
-- USER-SCOPED AVATAR TABLES
-- ============================================================

alter table public.usuario_inventario_avatar enable row level security;

drop policy if exists "usuario_inventario_avatar_select_own" on public.usuario_inventario_avatar;
create policy "usuario_inventario_avatar_select_own"
on public.usuario_inventario_avatar for select to authenticated
using (id_usuario = public.current_usuario_id());

drop policy if exists "usuario_inventario_avatar_select_admin" on public.usuario_inventario_avatar;
create policy "usuario_inventario_avatar_select_admin"
on public.usuario_inventario_avatar for select to authenticated
using (public.current_global_role() in (1, 2));

drop policy if exists "usuario_inventario_avatar_insert_own" on public.usuario_inventario_avatar;
create policy "usuario_inventario_avatar_insert_own"
on public.usuario_inventario_avatar for insert to authenticated
with check (id_usuario = public.current_usuario_id());

drop policy if exists "usuario_inventario_avatar_insert_admin" on public.usuario_inventario_avatar;
create policy "usuario_inventario_avatar_insert_admin"
on public.usuario_inventario_avatar for insert to authenticated
with check (public.current_global_role() in (1, 2));

-- avatar data is visible to all authenticated (needed for profile display of teammates)
alter table public.usuario_avatar enable row level security;

drop policy if exists "usuario_avatar_select_authenticated" on public.usuario_avatar;
create policy "usuario_avatar_select_authenticated"
on public.usuario_avatar for select to authenticated using (true);

drop policy if exists "usuario_avatar_insert_own" on public.usuario_avatar;
create policy "usuario_avatar_insert_own"
on public.usuario_avatar for insert to authenticated
with check (id_usuario = public.current_usuario_id());

drop policy if exists "usuario_avatar_insert_admin" on public.usuario_avatar;
create policy "usuario_avatar_insert_admin"
on public.usuario_avatar for insert to authenticated
with check (public.current_global_role() in (1, 2));

drop policy if exists "usuario_avatar_delete_own" on public.usuario_avatar;
create policy "usuario_avatar_delete_own"
on public.usuario_avatar for delete to authenticated
using (id_usuario = public.current_usuario_id());

drop policy if exists "usuario_avatar_delete_admin" on public.usuario_avatar;
create policy "usuario_avatar_delete_admin"
on public.usuario_avatar for delete to authenticated
using (public.current_global_role() in (1, 2));

-- ============================================================
-- PROJECT-SCOPED TABLES
-- ============================================================

-- sprint
alter table public.sprint enable row level security;

drop policy if exists "sprint_select_project_member" on public.sprint;
create policy "sprint_select_project_member"
on public.sprint for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "sprint_insert_project_member" on public.sprint;
create policy "sprint_insert_project_member"
on public.sprint for insert to authenticated
with check (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "sprint_update_project_member" on public.sprint;
create policy "sprint_update_project_member"
on public.sprint for update to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
)
with check (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "sprint_delete_admin" on public.sprint;
create policy "sprint_delete_admin"
on public.sprint for delete to authenticated
using (public.current_global_role() in (1, 2));

-- backlog_item
alter table public.backlog_item enable row level security;

drop policy if exists "backlog_item_select_project_member" on public.backlog_item;
create policy "backlog_item_select_project_member"
on public.backlog_item for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "backlog_item_insert_project_member" on public.backlog_item;
create policy "backlog_item_insert_project_member"
on public.backlog_item for insert to authenticated
with check (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "backlog_item_update_project_member" on public.backlog_item;
create policy "backlog_item_update_project_member"
on public.backlog_item for update to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
)
with check (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "backlog_item_delete_admin" on public.backlog_item;
create policy "backlog_item_delete_admin"
on public.backlog_item for delete to authenticated
using (public.current_global_role() in (1, 2));

-- backlog_item_sugerencia_creacion (joined through backlog_item for project scope)
alter table public.backlog_item_sugerencia_creacion enable row level security;

drop policy if exists "sugerencia_select_project_member" on public.backlog_item_sugerencia_creacion;
create policy "sugerencia_select_project_member"
on public.backlog_item_sugerencia_creacion for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or exists (
    select 1 from public.backlog_item bi
    where bi.id = backlog_item_sugerencia_creacion.id
    and public.is_project_member(bi.id_proyecto)
  )
);

drop policy if exists "sugerencia_insert_project_member" on public.backlog_item_sugerencia_creacion;
create policy "sugerencia_insert_project_member"
on public.backlog_item_sugerencia_creacion for insert to authenticated
with check (
  public.current_global_role() in (1, 2)
  or exists (
    select 1 from public.backlog_item bi
    where bi.id = backlog_item_sugerencia_creacion.id
    and public.is_project_member(bi.id_proyecto)
  )
);

drop policy if exists "sugerencia_update_project_member" on public.backlog_item_sugerencia_creacion;
create policy "sugerencia_update_project_member"
on public.backlog_item_sugerencia_creacion for update to authenticated
using (
  public.current_global_role() in (1, 2)
  or exists (
    select 1 from public.backlog_item bi
    where bi.id = backlog_item_sugerencia_creacion.id
    and public.is_project_member(bi.id_proyecto)
  )
)
with check (
  public.current_global_role() in (1, 2)
  or exists (
    select 1 from public.backlog_item bi
    where bi.id = backlog_item_sugerencia_creacion.id
    and public.is_project_member(bi.id_proyecto)
  )
);

-- etiqueta_proyecto_predeterminada
alter table public.etiqueta_proyecto_predeterminada enable row level security;

drop policy if exists "etiqueta_proyecto_select_project_member" on public.etiqueta_proyecto_predeterminada;
create policy "etiqueta_proyecto_select_project_member"
on public.etiqueta_proyecto_predeterminada for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "etiqueta_proyecto_insert_project_member" on public.etiqueta_proyecto_predeterminada;
create policy "etiqueta_proyecto_insert_project_member"
on public.etiqueta_proyecto_predeterminada for insert to authenticated
with check (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
);

drop policy if exists "etiqueta_proyecto_delete_admin" on public.etiqueta_proyecto_predeterminada;
create policy "etiqueta_proyecto_delete_admin"
on public.etiqueta_proyecto_predeterminada for delete to authenticated
using (public.current_global_role() in (1, 2));

-- usuario_proyecto_fte
alter table public.usuario_proyecto_fte enable row level security;

drop policy if exists "usuario_proyecto_fte_select_project_member" on public.usuario_proyecto_fte;
create policy "usuario_proyecto_fte_select_project_member"
on public.usuario_proyecto_fte for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or public.is_project_member(id_proyecto)
  or id_usuario = public.current_usuario_id()
);

drop policy if exists "usuario_proyecto_fte_insert_admin" on public.usuario_proyecto_fte;
create policy "usuario_proyecto_fte_insert_admin"
on public.usuario_proyecto_fte for insert to authenticated
with check (public.current_global_role() in (1, 2));

drop policy if exists "usuario_proyecto_fte_update_admin" on public.usuario_proyecto_fte;
create policy "usuario_proyecto_fte_update_admin"
on public.usuario_proyecto_fte for update to authenticated
using (public.current_global_role() in (1, 2))
with check (public.current_global_role() in (1, 2));

drop policy if exists "usuario_proyecto_fte_delete_admin" on public.usuario_proyecto_fte;
create policy "usuario_proyecto_fte_delete_admin"
on public.usuario_proyecto_fte for delete to authenticated
using (public.current_global_role() in (1, 2));
