-- Add fecha_completado column to backlog_item.
-- Automatically set to NOW() when id_estatus changes to 4 (Acabado).
-- Cleared back to NULL if the status moves away from 4.

ALTER TABLE backlog_item
  ADD COLUMN fecha_completado TIMESTAMPTZ;

-- Backfill existing rows that are already in Acabado status
UPDATE backlog_item
SET fecha_completado = NOW()
WHERE id_estatus = 4
  AND fecha_completado IS NULL;

-- Trigger function
CREATE OR REPLACE FUNCTION set_fecha_completado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id_estatus = 4 AND (OLD.id_estatus IS DISTINCT FROM 4) THEN
    NEW.fecha_completado := NOW();
  ELSIF NEW.id_estatus <> 4 AND OLD.id_estatus = 4 THEN
    NEW.fecha_completado := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to backlog_item
CREATE TRIGGER trg_backlog_item_fecha_completado
  BEFORE UPDATE ON backlog_item
  FOR EACH ROW
  EXECUTE FUNCTION set_fecha_completado();
