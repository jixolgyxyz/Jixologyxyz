-- Drop unused check_in sub-tables.
-- These tables were never referenced by the frontend and duplicate data
-- already available in backlog_item and impedimento_backlog_item.

DROP TABLE IF EXISTS check_in_avance_backlog_items;
DROP TABLE IF EXISTS check_in_impedimentos_backlog_items;

-- Drop child tables before their lookup parents
DROP TABLE IF EXISTS check_in_proximo_paso;
DROP TABLE IF EXISTS prioridad_proximo_paso_check_in;

DROP TABLE IF EXISTS check_in_riesgo;
DROP TABLE IF EXISTS nivel_riesgo_check_in;
