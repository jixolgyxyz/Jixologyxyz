-- Fix: cambios de estatus a "En Progreso" / "En Revisión" no se guardaban.
-- El trigger de GitHub lanzaba una excepción (vault / pg_net) y Postgres
-- revertía todo el UPDATE. Se envuelve la llamada en un bloque de excepción
-- para que un fallo en GitHub nunca aborte el cambio de estatus.

CREATE OR REPLACE FUNCTION public.trigger_github_create_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_github      BOOLEAN;
  v_has_branch      BOOLEAN;
  v_new_es_terminal BOOLEAN;
  v_new_orden       INT;
  v_service_key     TEXT;
BEGIN
  -- Solo cuando cambia el estatus
  IF NEW.id_estatus = OLD.id_estatus THEN
    RETURN NEW;
  END IF;

  -- Info del nuevo estatus
  SELECT es_terminal, orden
  INTO v_new_es_terminal, v_new_orden
  FROM estatus_backlog_item
  WHERE id = NEW.id_estatus;

  -- Ignorar si es terminal o si es el primer estatus (backlog inicial)
  IF v_new_es_terminal OR v_new_orden = 1 THEN
    RETURN NEW;
  END IF;

  -- Ignorar si el proyecto no tiene GitHub configurado
  SELECT EXISTS(
    SELECT 1 FROM proyecto_github_config WHERE id_proyecto = NEW.id_proyecto
  ) INTO v_has_github;

  IF NOT v_has_github THEN
    RETURN NEW;
  END IF;

  -- Ignorar si el item ya tiene branch
  SELECT EXISTS(
    SELECT 1 FROM backlog_item_github WHERE id_backlog_item = NEW.id
  ) INTO v_has_branch;

  IF v_has_branch THEN
    RETURN NEW;
  END IF;

  -- Llamar a github-create-branch; un fallo aquí no debe abortar el UPDATE
  BEGIN
    -- Leer service role key desde Vault
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    IF v_service_key IS NULL THEN
      RAISE WARNING 'trigger_github_create_branch: SUPABASE_SERVICE_ROLE_KEY no encontrada en Vault';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url     := 'https://rooqnfydadtifmsqfaxy.supabase.co/functions/v1/github-create-branch',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object(
        'projectId', NEW.id_proyecto,
        'itemId',    NEW.id,
        'itemTitle', NEW.nombre
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_github_create_branch: fallo al crear branch para item % — %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
