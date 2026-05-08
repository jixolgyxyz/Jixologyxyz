  CREATE POLICY "Miembros y admins pueden actualizar proyecto"
  ON proyecto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuario
      WHERE usuario.auth_id = auth.uid()
        AND usuario.id_rol_global = ANY (ARRAY[1, 2])
    )
    OR
    EXISTS (
      SELECT 1 FROM usuario_proyecto
      JOIN usuario ON usuario.id = usuario_proyecto.id_usuario
      WHERE usuario.auth_id = auth.uid()
        AND usuario_proyecto.id_proyecto = proyecto.id
    )
  );