-- RPC: agregar usuarios como PM al crear un proyecto.
--
-- usuario_proyecto tiene RLS y no admite INSERT directo desde el cliente
-- (igual que accept_project_invitation, que también escribe ahí vía RPC).
-- Esta función corre como SECURITY DEFINER: valida que quien llama sea el
-- creador del proyecto o un admin global, y luego agrega cada usuario como
-- miembro + etiqueta PM, todo en una sola transacción.

CREATE OR REPLACE FUNCTION agregar_pms_iniciales(
  p_id_proyecto integer,
  p_user_ids    integer[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    integer;
  v_rol_global smallint;
  v_creador    integer;
  v_uid        integer;
BEGIN
  -- Usuario autenticado
  SELECT u.id, u.id_rol_global
    INTO v_user_id, v_rol_global
  FROM usuario u
  WHERE u.auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  -- El proyecto debe existir; solo su creador o un admin global (rol 1/2)
  -- pueden agregarle miembros.
  SELECT id_creador INTO v_creador FROM proyecto WHERE id = p_id_proyecto;

  IF v_creador IS NULL THEN
    RAISE EXCEPTION 'Proyecto no encontrado.';
  END IF;

  IF v_creador <> v_user_id AND v_rol_global NOT IN (1, 2) THEN
    RAISE EXCEPTION 'No tienes permiso para agregar miembros a este proyecto.';
  END IF;

  -- Cada usuario seleccionado: miembro del proyecto + etiqueta PM (id 1).
  FOREACH v_uid IN ARRAY COALESCE(p_user_ids, ARRAY[]::integer[])
  LOOP
    INSERT INTO usuario_proyecto (id_usuario, id_proyecto)
    VALUES (v_uid, p_id_proyecto)
    ON CONFLICT DO NOTHING;

    INSERT INTO etiqueta_proyecto_predeterminada (
      id_usuario,
      id_etiqueta_proyecto_predeterminada,
      id_proyecto,
      fecha_asignacion,
      id_asignador
    )
    VALUES (v_uid, 1, p_id_proyecto, now(), v_user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
