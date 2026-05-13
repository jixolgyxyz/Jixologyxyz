-- Per-user dashboard graph visibility preferences.
-- One row per (user, graph) the user has explicitly toggled. Missing rows
-- fall back to the catalog default in client/src/features/dashboard/config/graphCatalog.ts.

CREATE TABLE "usuario_grafica_visibilidad" (
  "id_usuario"     INT          NOT NULL,
  "codigo_grafica" VARCHAR(50)  NOT NULL,
  "visible"        BOOLEAN      NOT NULL,
  PRIMARY KEY ("id_usuario", "codigo_grafica"),
  FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE
);

ALTER TABLE "usuario_grafica_visibilidad" ENABLE ROW LEVEL SECURITY;

-- Users can only see and mutate their own rows. Admins (roles 1/2) bypass.
CREATE POLICY "ugv_select_own_or_admin" ON "usuario_grafica_visibilidad"
  FOR SELECT
  USING (
    id_usuario IN (SELECT id FROM usuario WHERE auth_id = auth.uid())
    OR public.current_global_role() IN (1, 2)
  );

CREATE POLICY "ugv_insert_own" ON "usuario_grafica_visibilidad"
  FOR INSERT
  WITH CHECK (
    id_usuario IN (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

CREATE POLICY "ugv_update_own" ON "usuario_grafica_visibilidad"
  FOR UPDATE
  USING (
    id_usuario IN (SELECT id FROM usuario WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    id_usuario IN (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );

CREATE POLICY "ugv_delete_own" ON "usuario_grafica_visibilidad"
  FOR DELETE
  USING (
    id_usuario IN (SELECT id FROM usuario WHERE auth_id = auth.uid())
  );
