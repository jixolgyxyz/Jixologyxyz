DROP POLICY IF EXISTS project_select_access ON proyecto;

CREATE POLICY project_select_access
ON proyecto
FOR SELECT
TO authenticated
USING (
  -- Admins (rol global 1 o 2) ven todo
  EXISTS (
    SELECT 1 FROM usuario
    WHERE usuario.auth_id = auth.uid()
    AND usuario.id_rol_global IN (1, 2)
  )
  OR
  -- El usuario pertenece al proyecto
  EXISTS (
    SELECT 1 FROM usuario_proyecto
    JOIN usuario ON usuario.id = usuario_proyecto.id_usuario
    WHERE usuario.auth_id = auth.uid()
    AND usuario_proyecto.id_proyecto = proyecto.id
  )
);