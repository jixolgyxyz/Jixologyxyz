-- ── Add nombre and visibilidad columns to reporte ───────────────────────────
ALTER TABLE reporte
  ADD COLUMN IF NOT EXISTS nombre      TEXT,
  ADD COLUMN IF NOT EXISTS visibilidad TEXT NOT NULL DEFAULT 'publico'
                           CHECK (visibilidad IN ('publico', 'privado'));
