-- ================================================================
-- Invitation RLS + RPC functions
-- ================================================================

-- 1. Enable RLS so users only see their own invitations
ALTER TABLE invitacion_proyecto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitacion_proyecto_select_own"
  ON invitacion_proyecto FOR SELECT
  USING (
    id_usuario_destino = (
      SELECT id FROM usuario WHERE auth_id = auth.uid() LIMIT 1
    )
  );

-- 2. RPC: get_pending_invitations
--    Returns all pending (aceptada = false) invitations for the
--    currently authenticated user, joined with the project name.
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS TABLE (
  id                 INT,
  descripcion        VARCHAR,
  fecha_envio        TIMESTAMPTZ,
  id_proyecto        INT,
  nombre_proyecto    TEXT,
  id_usuario_creador INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id INT;
BEGIN
  SELECT u.id INTO v_user_id
  FROM usuario u
  WHERE u.auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  RETURN QUERY
  SELECT
    ip.id,
    ip.descripcion,
    ip.fecha_envio,
    ip.id_proyecto,
    p.nombre::TEXT AS nombre_proyecto,
    ip.id_usuario_creador
  FROM invitacion_proyecto ip
  JOIN proyecto p ON p.id = ip.id_proyecto
  WHERE ip.id_usuario_destino = v_user_id
    AND ip.aceptada = false
  ORDER BY ip.fecha_envio DESC;
END;
$$;

-- 3. RPC: accept_project_invitation
--    Verifies ownership, inserts into usuario_proyecto,
--    and marks the invitation as accepted.
CREATE OR REPLACE FUNCTION accept_project_invitation(p_invitacion_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id INT;
  v_inv     invitacion_proyecto%ROWTYPE;
BEGIN
  SELECT u.id INTO v_user_id
  FROM usuario u
  WHERE u.auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  SELECT * INTO v_inv FROM invitacion_proyecto WHERE id = p_invitacion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada.';
  END IF;

  IF v_inv.id_usuario_destino <> v_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para aceptar esta invitación.';
  END IF;

  -- Join the project (no-op if already a member)
  INSERT INTO usuario_proyecto (id_usuario, id_proyecto)
  VALUES (v_user_id, v_inv.id_proyecto)
  ON CONFLICT DO NOTHING;

  -- Mark accepted
  UPDATE invitacion_proyecto SET aceptada = true WHERE id = p_invitacion_id;
END;
$$;

-- 4. RPC: deny_project_invitation
--    Verifies ownership and removes the invitation (denial = deletion).
CREATE OR REPLACE FUNCTION deny_project_invitation(p_invitacion_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id INT;
  v_inv     invitacion_proyecto%ROWTYPE;
BEGIN
  SELECT u.id INTO v_user_id
  FROM usuario u
  WHERE u.auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  SELECT * INTO v_inv FROM invitacion_proyecto WHERE id = p_invitacion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada.';
  END IF;

  IF v_inv.id_usuario_destino <> v_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para rechazar esta invitación.';
  END IF;

  DELETE FROM invitacion_proyecto WHERE id = p_invitacion_id;
END;
$$;


-- ================================================================
-- INSERT policy for invitacion_proyecto
-- Allows: SAdmin (1), Admin (2), and PMs in the target project
-- ================================================================

CREATE POLICY "invitacion_proyecto_insert_authorized"
  ON invitacion_proyecto FOR INSERT
  WITH CHECK (
    -- The creator must be the authenticated user (no impersonation)
    id_usuario_creador = (SELECT id FROM usuario WHERE auth_id = auth.uid())
    AND (
      -- SAdmin or Admin can invite anyone to any project
      (SELECT id_rol_global FROM usuario WHERE auth_id = auth.uid()) IN (1, 2)
      OR
      -- PM in this specific project can also invite
      EXISTS (
        SELECT 1
        FROM etiqueta_proyecto_predeterminada epd
        JOIN catalogo_etiqueta_proyecto_predeterminada cepd
          ON cepd.id = epd.id_etiqueta_proyecto_predeterminada
        WHERE epd.id_usuario    = (SELECT id FROM usuario WHERE auth_id = auth.uid())
          AND epd.id_proyecto   = id_proyecto
          AND cepd.nombre       = 'PM'
      )
    )
  );

-- Any authenticated user can see all active users.
-- This is needed so PMs and project members can:
--   - See the list of users available to invite
--   - See other project members in the config page
-- Existing admin policy already covers inactive users for admins.
CREATE POLICY "usuario_select_all_active_authenticated"
  ON usuario FOR SELECT
  TO authenticated
  USING (activo = true);
