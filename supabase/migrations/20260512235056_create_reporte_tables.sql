-- Create reporte table to store Gemini-generated weekly reports
CREATE TABLE public.reporte (
  id                   SERIAL PRIMARY KEY,
  contenido            TEXT        NOT NULL,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT now(),
  semana_inicio        DATE        NOT NULL,
  id_usuario_creador   INT         REFERENCES public.usuario(id)
);

-- Junction table: links a report to the check-ins active during that week
CREATE TABLE public.check_ins_incluidos (
  id_reporte   INT    NOT NULL REFERENCES public.reporte(id)    ON DELETE CASCADE,
  id_check_in  BIGINT NOT NULL REFERENCES public.check_in(id)   ON DELETE CASCADE,
  PRIMARY KEY (id_reporte, id_check_in)
);

-- ── RLS: reporte ─────────────────────────────────────────────────────────────

ALTER TABLE public.reporte ENABLE ROW LEVEL SECURITY;

-- Admins can read all reports; creators can read their own
DROP POLICY IF EXISTS "reporte_select_admin" ON public.reporte;
CREATE POLICY "reporte_select_admin"
ON public.reporte FOR SELECT TO authenticated
USING (public.current_global_role() IN (1, 2));

DROP POLICY IF EXISTS "reporte_select_own" ON public.reporte;
CREATE POLICY "reporte_select_own"
ON public.reporte FOR SELECT TO authenticated
USING (id_usuario_creador = public.current_usuario_id());

-- Only admins can insert/delete reports
DROP POLICY IF EXISTS "reporte_insert_admin" ON public.reporte;
CREATE POLICY "reporte_insert_admin"
ON public.reporte FOR INSERT TO authenticated
WITH CHECK (public.current_global_role() IN (1, 2));

DROP POLICY IF EXISTS "reporte_delete_admin" ON public.reporte;
CREATE POLICY "reporte_delete_admin"
ON public.reporte FOR DELETE TO authenticated
USING (public.current_global_role() IN (1, 2));

-- ── RLS: check_ins_incluidos ──────────────────────────────────────────────────

ALTER TABLE public.check_ins_incluidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check_ins_incluidos_select_admin" ON public.check_ins_incluidos;
CREATE POLICY "check_ins_incluidos_select_admin"
ON public.check_ins_incluidos FOR SELECT TO authenticated
USING (public.current_global_role() IN (1, 2));

DROP POLICY IF EXISTS "check_ins_incluidos_insert_admin" ON public.check_ins_incluidos;
CREATE POLICY "check_ins_incluidos_insert_admin"
ON public.check_ins_incluidos FOR INSERT TO authenticated
WITH CHECK (public.current_global_role() IN (1, 2));

DROP POLICY IF EXISTS "check_ins_incluidos_delete_admin" ON public.check_ins_incluidos;
CREATE POLICY "check_ins_incluidos_delete_admin"
ON public.check_ins_incluidos FOR DELETE TO authenticated
USING (public.current_global_role() IN (1, 2));

-- ── RLS: check_in (enable if not already) ────────────────────────────────────

ALTER TABLE public.check_in ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check_in_select_admin" ON public.check_in;
CREATE POLICY "check_in_select_admin"
ON public.check_in FOR SELECT TO authenticated
USING (public.current_global_role() IN (1, 2));

DROP POLICY IF EXISTS "check_in_select_project_member" ON public.check_in;
CREATE POLICY "check_in_select_project_member"
ON public.check_in FOR SELECT TO authenticated
USING (public.is_project_member(id_proyecto));

DROP POLICY IF EXISTS "check_in_insert_project_member" ON public.check_in;
CREATE POLICY "check_in_insert_project_member"
ON public.check_in FOR INSERT TO authenticated
WITH CHECK (
  public.current_global_role() IN (1, 2)
  OR public.is_project_member(id_proyecto)
);

DROP POLICY IF EXISTS "check_in_delete_admin" ON public.check_in;
CREATE POLICY "check_in_delete_admin"
ON public.check_in FOR DELETE TO authenticated
USING (public.current_global_role() IN (1, 2));
