-- The previous migration created a circular RLS dependency:
--   backlog_item policy → NOT EXISTS (SELECT FROM backlog_item_sugerencia_creacion)
--     → triggers sugerencia RLS → SELECT FROM backlog_item
--       → triggers backlog_item RLS → infinite recursion → all rows hidden
--
-- Fix: a security definer helper that queries the sugerencia table bypassing its
-- RLS policy. The backlog_item policy calls this helper, so the sugerencia table
-- is never queried through RLS from within the backlog_item policy evaluation.

create or replace function public.is_pending_suggestion(p_item_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.backlog_item_sugerencia_creacion
    where id = p_item_id and aceptada = false
  );
$$;

-- Recreate backlog_item policy using the helper (no direct subquery on the
-- sugerencia table, so no circular dependency).
drop policy if exists "backlog_item_select_project_member" on public.backlog_item;
create policy "backlog_item_select_project_member"
on public.backlog_item for select to authenticated
using (
  public.current_global_role() in (1, 2)
  or (
    public.is_project_member(id_proyecto)
    and (
      not public.is_pending_suggestion(id)
      or public.is_project_pm(id_proyecto)
      or id_usuario_creador = public.current_usuario_id()
    )
  )
);
