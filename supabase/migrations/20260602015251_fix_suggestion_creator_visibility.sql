-- Helper: returns true if the current user holds the PM label (id = 1) on the given project
create or replace function public.is_project_pm(p_id_proyecto int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.etiqueta_proyecto_predeterminada epp
    join public.usuario u on u.id = epp.id_usuario
    where u.auth_id = auth.uid()
      and epp.id_proyecto = p_id_proyecto
      and epp.id_etiqueta_proyecto_predeterminada = 1
  );
$$;

-- backlog_item: hide pending suggestions from members who are neither PM nor the creator
drop policy if exists "backlog_item_select_project_member" on public.backlog_item;
create policy "backlog_item_select_project_member"
on public.backlog_item for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or (
    public.is_project_member(id_proyecto)
    and (
      -- not a pending suggestion → all members can see it
      not exists (
        select 1 from public.backlog_item_sugerencia_creacion s
        where s.id = backlog_item.id and s.aceptada = false
      )
      -- PM of the project can see all pending suggestions
      or public.is_project_pm(id_proyecto)
      -- the user who created the item can always see their own suggestion
      or id_usuario_creador = public.current_usuario_id()
    )
  )
);

-- backlog_item_sugerencia_creacion: only PM or item creator can read the suggestion row
drop policy if exists "sugerencia_select_project_member" on public.backlog_item_sugerencia_creacion;
create policy "sugerencia_select_project_member"
on public.backlog_item_sugerencia_creacion for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or exists (
    select 1 from public.backlog_item bi
    where bi.id = backlog_item_sugerencia_creacion.id
      and public.is_project_member(bi.id_proyecto)
      and (
        public.is_project_pm(bi.id_proyecto)
        or bi.id_usuario_creador = public.current_usuario_id()
      )
  )
);
