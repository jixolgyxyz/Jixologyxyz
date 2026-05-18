-- Fix 1: Expand the DELETE policy on etiqueta_proyecto_predeterminada to include PMs.
-- Previously only global admins (roles 1,2) could delete; PMs could insert but not delete.
DROP POLICY IF EXISTS "etiqueta_proyecto_delete_admin" ON public.etiqueta_proyecto_predeterminada;

CREATE POLICY "etiqueta_proyecto_delete_pm_or_admin"
ON public.etiqueta_proyecto_predeterminada FOR DELETE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada pm_row
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cat
          ON cat.id = pm_row.id_etiqueta_proyecto_predeterminada
        WHERE pm_row.id_usuario  = public.current_usuario_id()
          AND pm_row.id_proyecto = etiqueta_proyecto_predeterminada.id_proyecto
          AND cat.nombre = 'PM'
    )
);

-- Fix 2: etiqueta_proyecto_personalizada had NO RLS enabled, meaning any authenticated
-- user could insert/delete custom-etiqueta assignments with no project membership check.
-- Enable RLS and add matching policies.

ALTER TABLE public.etiqueta_proyecto_personalizada ENABLE ROW LEVEL SECURITY;

-- SELECT: any project member can read assignments for that project's etiquetas
CREATE POLICY "etiqueta_pers_select_project_member"
ON public.etiqueta_proyecto_personalizada FOR SELECT TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.catalogo_etiqueta_proyecto_personalizada cat
        WHERE cat.id = etiqueta_proyecto_personalizada.id_etiqueta_proyecto_personalizada
          AND public.is_project_member(cat.id_proyecto)
    )
);

-- INSERT: same scope as predeterminada (any project member)
CREATE POLICY "etiqueta_pers_insert_project_member"
ON public.etiqueta_proyecto_personalizada FOR INSERT TO authenticated
WITH CHECK (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.catalogo_etiqueta_proyecto_personalizada cat
        WHERE cat.id = etiqueta_proyecto_personalizada.id_etiqueta_proyecto_personalizada
          AND public.is_project_member(cat.id_proyecto)
    )
);

-- DELETE: PM in the project or global admin
CREATE POLICY "etiqueta_pers_delete_pm_or_admin"
ON public.etiqueta_proyecto_personalizada FOR DELETE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.catalogo_etiqueta_proyecto_personalizada cat
        JOIN public.etiqueta_proyecto_predeterminada pm_row
          ON pm_row.id_proyecto = cat.id_proyecto
        JOIN public.catalogo_etiqueta_proyecto_predeterminada pm_cat
          ON pm_cat.id = pm_row.id_etiqueta_proyecto_predeterminada
        WHERE cat.id = etiqueta_proyecto_personalizada.id_etiqueta_proyecto_personalizada
          AND pm_row.id_usuario = public.current_usuario_id()
          AND pm_cat.nombre = 'PM'
    )
);

-- Fix 1: Allow PMs to INSERT into usuario_proyecto_fte.
-- Previously only global admins (roles 1,2) could upsert jornada.
DROP POLICY IF EXISTS "usuario_proyecto_fte_insert_admin" ON public.usuario_proyecto_fte;

CREATE POLICY "usuario_proyecto_fte_insert_pm_or_admin"
ON public.usuario_proyecto_fte FOR INSERT TO authenticated
WITH CHECK (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre = 'PM'
    )
);

-- Fix 2: Allow PMs to UPDATE usuario_proyecto_fte.
DROP POLICY IF EXISTS "usuario_proyecto_fte_update_admin" ON public.usuario_proyecto_fte;

CREATE POLICY "usuario_proyecto_fte_update_pm_or_admin"
ON public.usuario_proyecto_fte FOR UPDATE TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre = 'PM'
    )
)
WITH CHECK (
    public.current_global_role() IN (1, 2)
    OR EXISTS (
        SELECT 1
        FROM public.etiqueta_proyecto_predeterminada epp
        JOIN public.catalogo_etiqueta_proyecto_predeterminada cepp
          ON cepp.id = epp.id_etiqueta_proyecto_predeterminada
        WHERE epp.id_usuario  = public.current_usuario_id()
          AND epp.id_proyecto = usuario_proyecto_fte.id_proyecto
          AND cepp.nombre = 'PM'
    )
);

-- Fix 3: Expand SELECT so a PM can see each project member's committed hours
-- in projects the PM might not be part of.
-- Without this, fetchCommittedHoursExcludingProject returns 0 for every member
-- (because the SELECT policy couldn't see their FTE rows in other projects),
-- making max_horas equal to the full jornada regardless of other commitments.
DROP POLICY IF EXISTS "usuario_proyecto_fte_select_project_member" ON public.usuario_proyecto_fte;

CREATE POLICY "usuario_proyecto_fte_select_extended"
ON public.usuario_proyecto_fte FOR SELECT TO authenticated
USING (
    public.current_global_role() IN (1, 2)
    -- own data in any project
    OR id_usuario = public.current_usuario_id()
    -- data for projects you belong to
    OR public.is_project_member(id_proyecto)
    -- data of teammates (users who share any project with you) in any project they're in
    -- needed so a PM can see how many hours a member has committed elsewhere
    OR EXISTS (
        SELECT 1
        FROM public.usuario_proyecto shared
        JOIN public.usuario_proyecto mine
          ON mine.id_proyecto = shared.id_proyecto
        WHERE shared.id_usuario = usuario_proyecto_fte.id_usuario
          AND mine.id_usuario  = public.current_usuario_id()
    )
);
