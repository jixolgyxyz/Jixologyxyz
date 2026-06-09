BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'notificaciones-backlog-items-proximos-vencer',
  '0 0 * * *',
  $cron$
    SELECT public.generar_notificaciones_backlog_items_proximos_vencer(48);
  $cron$
);

SELECT cron.schedule(
  'notificaciones-sprints-proximos-vencer',
  '5 0 * * *',
  $cron$
    SELECT public.generar_notificaciones_sprints_proximos_vencer(48);
  $cron$
);

SELECT cron.schedule(
  'limpiar-historial-pg-cron',
  '10 0 * * *',
  $cron$
    DELETE
    FROM cron.job_run_details
    WHERE end_time < now() - interval '7 days';
  $cron$
);

COMMIT;