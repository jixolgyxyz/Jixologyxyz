-- =============================================================
-- backlog_item_bloqueo
-- Junction table: one backlog item can be blocked by many others
--   id_bloqueado  → the item whose progress is being blocked
--   id_bloqueador → the item that must be resolved/completed first
-- =============================================================

CREATE TABLE "backlog_item_bloqueo" (
  "id_bloqueado"       BIGINT      NOT NULL,
  "id_bloqueador"      BIGINT      NOT NULL,
  "fecha_creacion"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "id_usuario_creador" INT         NOT NULL,
  PRIMARY KEY ("id_bloqueado", "id_bloqueador")
);

-- A backlog item cannot block itself
ALTER TABLE "backlog_item_bloqueo"
  ADD CONSTRAINT "backlog_item_bloqueo_no_self_block"
  CHECK ("id_bloqueado" <> "id_bloqueador");

ALTER TABLE "backlog_item_bloqueo"
  ADD FOREIGN KEY ("id_bloqueado")
  REFERENCES "backlog_item" ("id")
  ON DELETE CASCADE
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_bloqueo"
  ADD FOREIGN KEY ("id_bloqueador")
  REFERENCES "backlog_item" ("id")
  ON DELETE CASCADE
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "backlog_item_bloqueo"
  ADD FOREIGN KEY ("id_usuario_creador")
  REFERENCES "usuario" ("id")
  DEFERRABLE INITIALLY IMMEDIATE;

-- Index for reverse lookup: "which items does X block?"
CREATE INDEX "idx_backlog_item_bloqueo_bloqueador"
  ON "backlog_item_bloqueo" ("id_bloqueador");

-- =============================================================
-- RLS
-- Access is scoped to project members of the blocked item's project.
-- Both sides of the relationship are assumed to belong to the same
-- project (enforced at the application level).
-- =============================================================

ALTER TABLE public.backlog_item_bloqueo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backlog_item_bloqueo_select_project_member" ON public.backlog_item_bloqueo;
CREATE POLICY "backlog_item_bloqueo_select_project_member"
ON public.backlog_item_bloqueo FOR SELECT TO authenticated
USING (
  public.current_global_role() IN (1, 2)
  OR EXISTS (
    SELECT 1 FROM public.backlog_item bi
    WHERE bi.id = backlog_item_bloqueo.id_bloqueado
    AND public.is_project_member(bi.id_proyecto)
  )
);

DROP POLICY IF EXISTS "backlog_item_bloqueo_insert_project_member" ON public.backlog_item_bloqueo;
CREATE POLICY "backlog_item_bloqueo_insert_project_member"
ON public.backlog_item_bloqueo FOR INSERT TO authenticated
WITH CHECK (
  public.current_global_role() IN (1, 2)
  OR EXISTS (
    SELECT 1 FROM public.backlog_item bi
    WHERE bi.id = backlog_item_bloqueo.id_bloqueado
    AND public.is_project_member(bi.id_proyecto)
  )
);

DROP POLICY IF EXISTS "backlog_item_bloqueo_delete_project_member" ON public.backlog_item_bloqueo;
CREATE POLICY "backlog_item_bloqueo_delete_project_member"
ON public.backlog_item_bloqueo FOR DELETE TO authenticated
USING (
  public.current_global_role() IN (1, 2)
  OR EXISTS (
    SELECT 1 FROM public.backlog_item bi
    WHERE bi.id = backlog_item_bloqueo.id_bloqueado
    AND public.is_project_member(bi.id_proyecto)
  )
);
