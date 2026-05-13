-- Extend bitacora_sprint with AI report field
ALTER TABLE bitacora_sprint ADD COLUMN IF NOT EXISTS reporte_ia TEXT;

-- RLS for bitacora_sprint
ALTER TABLE bitacora_sprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_read_bitacora_sprint"
ON bitacora_sprint FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sprint s
        JOIN usuario_proyecto up ON up.id_proyecto = s.id_proyecto
        JOIN usuario u ON u.id = up.id_usuario
        WHERE s.id = bitacora_sprint.id_sprint
          AND u.auth_id = auth.uid()
    )
);

-- Server inserts via service role (bypasses RLS), but keep a policy for direct client inserts
CREATE POLICY "members_can_insert_bitacora_sprint"
ON bitacora_sprint FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sprint s
        JOIN usuario_proyecto up ON up.id_proyecto = s.id_proyecto
        JOIN usuario u ON u.id = up.id_usuario
        WHERE s.id = bitacora_sprint.id_sprint
          AND u.auth_id = auth.uid()
          AND u.id = bitacora_sprint.id_usuario_creador
    )
);

-- RPC that gathers all sprint data for AI analysis.
-- p_usuario_id is the internal usuario.id verified server-side before calling this.
CREATE OR REPLACE FUNCTION get_sprint_report_data(p_sprint_id BIGINT, p_usuario_id INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verify the user is a member of the project this sprint belongs to
    IF NOT EXISTS (
        SELECT 1 FROM sprint s
        JOIN usuario_proyecto up ON up.id_proyecto = s.id_proyecto
        WHERE s.id = p_sprint_id AND up.id_usuario = p_usuario_id
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: el usuario no es miembro del proyecto de este sprint';
    END IF;

    SELECT json_build_object(

        -- ── Sprint header ────────────────────────────────────────────────────
        'sprint', (
            SELECT json_build_object(
                'id',                   s.id,
                'nombre',               s.nombre,
                'objetivo',             s.objetivo,
                'fecha_inicio',         s.fecha_inicio,
                'fecha_final',          s.fecha_final,
                'estatus',              es.nombre,
                'proyecto_nombre',      p.nombre,
                'proyecto_metodologia', m.nombre
            )
            FROM sprint s
            JOIN estatus_sprint        es ON es.id = s.id_estatus
            JOIN proyecto              p  ON p.id  = s.id_proyecto
            JOIN metodologia_proyecto  m  ON m.id  = p.id_metodologia
            WHERE s.id = p_sprint_id
        ),

        -- ── Aggregate totals ─────────────────────────────────────────────────
        'resumen', (
            SELECT json_build_object(
                'total_items',               COUNT(*),
                'completados',               COUNT(*) FILTER (WHERE ebi.es_terminal = true),
                'pendientes',                COUNT(*) FILTER (WHERE ebi.es_terminal = false),
                'tasa_completitud_pct',      CASE WHEN COUNT(*) > 0
                                                 THEN ROUND((COUNT(*) FILTER (WHERE ebi.es_terminal = true)::NUMERIC / COUNT(*)) * 100, 1)
                                                 ELSE 0 END,
                'complejidad_promedio',      ROUND(AVG(bi.complejidad) FILTER (WHERE bi.complejidad IS NOT NULL)::NUMERIC, 2),
                'tiempo_total_estimado_h',   SUM(bi.tiempo) FILTER (WHERE bi.tiempo IS NOT NULL),
                'sin_asignar',               COUNT(*) FILTER (WHERE bi.id_usuario_responsable IS NULL),
                'sin_complejidad',           COUNT(*) FILTER (WHERE bi.complejidad IS NULL),
                'por_prioridad_total', (
                    SELECT COALESCE(json_object_agg(prioridad, cnt), '{}')
                    FROM (
                        SELECT COALESCE(pbi2.nombre, 'Sin prioridad') AS prioridad, COUNT(*) AS cnt
                        FROM backlog_item bi2
                        LEFT JOIN prioridad_backlog_item pbi2 ON pbi2.id = bi2.id_prioridad
                        WHERE bi2.id_sprint = p_sprint_id
                        GROUP BY pbi2.nombre
                    ) pp
                ),
                'por_prioridad_completados', (
                    SELECT COALESCE(json_object_agg(prioridad, cnt), '{}')
                    FROM (
                        SELECT COALESCE(pbi3.nombre, 'Sin prioridad') AS prioridad, COUNT(*) AS cnt
                        FROM backlog_item bi4
                        LEFT JOIN prioridad_backlog_item pbi3 ON pbi3.id = bi4.id_prioridad
                        JOIN estatus_backlog_item ebi2 ON ebi2.id = bi4.id_estatus
                        WHERE bi4.id_sprint = p_sprint_id AND ebi2.es_terminal = true
                        GROUP BY pbi3.nombre
                    ) cp
                ),
                'por_tipo_total', (
                    SELECT COALESCE(json_object_agg(tipo, cnt), '{}')
                    FROM (
                        SELECT tbi2.nombre AS tipo, COUNT(*) AS cnt
                        FROM backlog_item bi3
                        JOIN tipo_backlog_item tbi2 ON tbi2.id = bi3.id_tipo
                        WHERE bi3.id_sprint = p_sprint_id
                        GROUP BY tbi2.nombre
                    ) tt
                ),
                'por_tipo_completados', (
                    SELECT COALESCE(json_object_agg(tipo, cnt), '{}')
                    FROM (
                        SELECT tbi3.nombre AS tipo, COUNT(*) AS cnt
                        FROM backlog_item bi5
                        JOIN tipo_backlog_item tbi3 ON tbi3.id = bi5.id_tipo
                        JOIN estatus_backlog_item ebi3 ON ebi3.id = bi5.id_estatus
                        WHERE bi5.id_sprint = p_sprint_id AND ebi3.es_terminal = true
                        GROUP BY tbi3.nombre
                    ) tc
                )
            )
            FROM backlog_item bi
            JOIN estatus_backlog_item ebi ON ebi.id = bi.id_estatus
            WHERE bi.id_sprint = p_sprint_id
        ),

        -- ── Full item list (for deep analysis) ──────────────────────────────
        'items', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'nombre',            bi.nombre,
                    'tipo',              tbi.nombre,
                    'prioridad',         COALESCE(pbi.nombre, 'Sin prioridad'),
                    'estatus',           ebi.nombre,
                    'completado',        ebi.es_terminal,
                    'complejidad',       bi.complejidad,
                    'tiempo_estimado_h', bi.tiempo,
                    'fecha_inicio',      bi.fecha_inicio,
                    'fecha_vencimiento', bi.fecha_vencimiento,
                    'responsable',       COALESCE(u.nombre || ' ' || u.apellido, 'Sin asignar')
                )
                ORDER BY ebi.es_terminal DESC, pbi.id ASC NULLS LAST
            ), '[]'::json)
            FROM backlog_item bi
            JOIN      tipo_backlog_item      tbi ON tbi.id = bi.id_tipo
            LEFT JOIN prioridad_backlog_item pbi ON pbi.id = bi.id_prioridad
            JOIN      estatus_backlog_item   ebi ON ebi.id = bi.id_estatus
            LEFT JOIN usuario                  u ON u.id  = bi.id_usuario_responsable
            WHERE bi.id_sprint = p_sprint_id
        ),

        -- ── Per-collaborator breakdown ───────────────────────────────────────
        'colaboradores', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'nombre',                          u.nombre || ' ' || u.apellido,
                    'items_asignados',                 stats.total,
                    'items_completados',               stats.completados,
                    'tasa_completitud_pct',            CASE WHEN stats.total > 0
                                                           THEN ROUND((stats.completados::NUMERIC / stats.total) * 100, 1)
                                                           ELSE 0 END,
                    'complejidad_promedio_asignada',   ROUND(stats.comp_avg::NUMERIC, 2),
                    'complejidad_promedio_completada', ROUND(stats.comp_completados_avg::NUMERIC, 2),
                    'tiempo_estimado_total_h',         stats.tiempo_total,
                    'tipos_de_items',                  stats.tipos,
                    'prioridades_de_items',            stats.prioridades
                )
            ), '[]'::json)
            FROM (
                SELECT
                    bi.id_usuario_responsable,
                    COUNT(*)                                                      AS total,
                    COUNT(*) FILTER (WHERE ebi.es_terminal = true)               AS completados,
                    AVG(bi.complejidad)                                           AS comp_avg,
                    AVG(bi.complejidad) FILTER (WHERE ebi.es_terminal = true)     AS comp_completados_avg,
                    SUM(bi.tiempo)                                                AS tiempo_total,
                    (
                        SELECT COALESCE(json_object_agg(tipo, cnt), '{}')
                        FROM (
                            SELECT tbi2.nombre AS tipo, COUNT(*) AS cnt
                            FROM backlog_item bi2
                            JOIN tipo_backlog_item tbi2 ON tbi2.id = bi2.id_tipo
                            WHERE bi2.id_sprint = p_sprint_id
                              AND bi2.id_usuario_responsable = bi.id_usuario_responsable
                            GROUP BY tbi2.nombre
                        ) t
                    ) AS tipos,
                    (
                        SELECT COALESCE(json_object_agg(prioridad, cnt), '{}')
                        FROM (
                            SELECT COALESCE(pbi2.nombre, 'Sin prioridad') AS prioridad, COUNT(*) AS cnt
                            FROM backlog_item bi3
                            LEFT JOIN prioridad_backlog_item pbi2 ON pbi2.id = bi3.id_prioridad
                            WHERE bi3.id_sprint = p_sprint_id
                              AND bi3.id_usuario_responsable = bi.id_usuario_responsable
                            GROUP BY pbi2.nombre
                        ) p
                    ) AS prioridades
                FROM backlog_item bi
                JOIN estatus_backlog_item ebi ON ebi.id = bi.id_estatus
                WHERE bi.id_sprint = p_sprint_id
                  AND bi.id_usuario_responsable IS NOT NULL
                GROUP BY bi.id_usuario_responsable
            ) stats
            JOIN usuario u ON u.id = stats.id_usuario_responsable
        )

    ) INTO v_result;

    RETURN v_result;
END;
$$;
