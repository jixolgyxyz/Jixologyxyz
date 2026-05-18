-- Allow PMs to remove members from their project.
-- SELECT and INSERT on usuario_proyecto were already open to project members;
-- DELETE was missing a PM path.
alter table public.usuario_proyecto enable row level security;

drop policy if exists "usuario_proyecto_delete_pm_or_admin" on public.usuario_proyecto;

create policy "usuario_proyecto_delete_pm_or_admin"
on public.usuario_proyecto for delete to authenticated
using (
    public.current_global_role() in (1, 2)
    or exists (
        select 1
        from public.etiqueta_proyecto_predeterminada epp
        join public.catalogo_etiqueta_proyecto_predeterminada cepp
          on cepp.id = epp.id_etiqueta_proyecto_predeterminada
        where epp.id_usuario  = public.current_usuario_id()
          and epp.id_proyecto = usuario_proyecto.id_proyecto
          and cepp.nombre = 'PM'
    )
);

drop policy if exists "usuario_proyecto_select_member_or_admin" on public.usuario_proyecto;

create policy "usuario_proyecto_select_member_or_admin"
on public.usuario_proyecto for select to authenticated
using (
    public.current_global_role() in (1, 2)
    or id_usuario = public.current_usuario_id()
    or public.is_project_member(id_proyecto)
);
