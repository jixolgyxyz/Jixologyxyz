-- Fix project_card_view: completed_backlog_items now counts items whose status
-- has es_terminal = true instead of the hardcoded id_estatus = 1 ("Por Hacer").

CREATE OR REPLACE VIEW project_card_view AS
SELECT
    p.id,
    p.nombre,
    p.id_estatus,
    p.stack_tecnologico,
    p.fecha_final,
    p.descripcion,
    p.fte,
    COUNT(b.id)                                              AS total_backlog_items,
    COUNT(b.id) FILTER (WHERE ebi.es_terminal = true)        AS completed_backlog_items,
    ROUND(
      COUNT(b.id) FILTER (WHERE ebi.es_terminal = true) * 100.0
      / NULLIF(COUNT(b.id), 0)
    )                                                        AS completion_percentage
FROM proyecto p
LEFT JOIN backlog_item b            ON b.id_proyecto = p.id
LEFT JOIN estatus_backlog_item ebi  ON ebi.id = b.id_estatus
GROUP BY p.id, p.nombre, p.id_estatus, p.stack_tecnologico,
         p.fecha_final, p.descripcion, p.fte;
