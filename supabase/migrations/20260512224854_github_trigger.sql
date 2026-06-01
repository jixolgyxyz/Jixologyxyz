CREATE EXTENSION IF NOT EXISTS pg_net;

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

  -- Leer service role key desde Vault
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

  -- Llamar a github-create-branch
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_backlog_item_status_change
  AFTER UPDATE OF id_estatus ON backlog_item
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_github_create_branch();
