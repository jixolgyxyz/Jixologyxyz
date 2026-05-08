-- Habilitar RLS en la tabla proyecto
ALTER TABLE proyecto ENABLE ROW LEVEL SECURITY;

-- Policy: un usuario ve un proyecto si es admin o pertenece a él
CREATE POLICY "project_select_access"
ON proyecto
FOR SELECT
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
