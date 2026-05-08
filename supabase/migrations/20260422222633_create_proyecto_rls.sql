ALTER TABLE divisa ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodologia_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatus_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE complejidad_proyecto ENABLE ROW LEVEL SECURITY;

CREATE POLICY divisa_select_authenticated
  ON divisa
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY metodologia_select_authenticated
  ON metodologia_proyecto
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY estatus_select_authenticated
  ON estatus_proyecto
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY tipo_select_authenticated
  ON tipo_proyecto
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY modelo_facturacion_select_authenticated
  ON modelo_facturacion
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY complejidad_select_authenticated
  ON complejidad_proyecto
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY proyecto_insert_admin_or_superadmin
ON proyecto
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM usuario u
    WHERE u.auth_id = auth.uid()
      AND u.id = proyecto.id_creador
      AND u.id_rol_global IN (1, 2)
  )
);