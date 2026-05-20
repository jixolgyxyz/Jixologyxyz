-- ── Shift backlog_item dates forward ───────────────────────────────────
-- Bumps every backlog item's creation, due and completion dates by a fixed
-- amount, so the dummy data keeps lining up with "today" WITHOUT having to
-- edit / re-run InsertDummyBacklogItems.sql.
--
-- Run it whenever the seeded dates have drifted into the past (e.g. once a
-- week). Re-running shifts again — it is cumulative, not idempotent.
--
-- To change the amount, edit the single INTERVAL value below:
--   '7 days'    → move dates one week forward
--   '14 days'   → two weeks forward
--   '-7 days'   → move dates one week back
--
-- fecha_completado is shifted too: if only the due/creation dates moved, the
-- "completed before / at / after due" relationships (used by the weekly
-- progress and estimation charts) would break.

BEGIN;

UPDATE backlog_item
SET
  fecha_creacion    =  fecha_creacion    + shift.amount,
  fecha_vencimiento = (fecha_vencimiento + shift.amount)::date,
  fecha_completado  =  fecha_completado  + shift.amount
FROM (SELECT INTERVAL '7 days' AS amount) AS shift
-- Scope to the dummy seed only — uncomment if real items share this table:
-- WHERE backlog_item.id <= 57
;

COMMIT;
