DROP POLICY IF EXISTS proyecto_update_admin_or_superadmin ON proyecto;

CREATE POLICY proyecto_update_admin_or_superadmin
ON proyecto
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.auth_id = auth.uid()
        AND u.id_rol_global IN (1, 2)
    )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM usuario u
    WHERE u.auth_id = auth.uid()
      AND u.id_rol_global IN (1, 2)
  )
);