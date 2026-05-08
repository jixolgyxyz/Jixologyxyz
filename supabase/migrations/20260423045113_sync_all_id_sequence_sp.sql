CREATE OR REPLACE PROCEDURE sync_all_id_sequences()
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  seq_name TEXT;
  max_id BIGINT;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_class c
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    JOIN pg_attribute a
      ON a.attrelid = c.oid
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND a.attname = 'id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    seq_name := pg_get_serial_sequence(
      format('%I.%I', rec.schema_name, rec.table_name),
      rec.column_name
    );

    IF seq_name IS NOT NULL THEN
      EXECUTE format(
        'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
        rec.column_name,
        rec.schema_name,
        rec.table_name
      )
      INTO max_id;

    IF max_id = 0 THEN
    EXECUTE format(
        'SELECT setval(%L, 1, false)',
        seq_name
    );
    ELSE
    EXECUTE format(
        'SELECT setval(%L, %s, true)',
        seq_name,
        max_id
    );
    END IF;

      RAISE NOTICE 'Secuencia sincronizada: %, tabla: %.%, max_id: %',
        seq_name, rec.schema_name, rec.table_name, max_id;
    END IF;
  END LOOP;
END;
$$;

CALL sync_all_id_sequences();