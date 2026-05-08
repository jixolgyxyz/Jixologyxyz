INSERT INTO proyecto (nombre, descripcion, cliente, fecha_inicial, fecha_final, fecha_creacion, id_estatus, id_metodologia, id_creador, stack_tecnologico)
OVERRIDING SYSTEM VALUE VALUES
  ('Proyecto Alpha',
      'Migración completa del sistema legacy a arquitectura moderna.',
      'Mahindra', '2025-09-01', '2026-06-01', NOW(), 1, 1, 1,
      ARRAY['React', 'Supabase', 'TypeScript']),

  ('Proyecto Beta',
      'Módulo de reportes financieros con exportación a PDF y Excel.',
      'Cliente B', '2025-11-01', '2026-08-15', NOW(), 2, 2, 1,
      ARRAY['Vue', 'Node.js', 'PostgreSQL']),

  ('Proyecto Gamma',
      'Integración con API de pagos externos. Bloqueado por proveedor.',
      'Cliente C', '2025-12-01', '2026-05-10', NOW(), 3, 1, 1,
      ARRAY['React', 'Stripe', 'Express']),

  ('Proyecto Delta',
      'App móvil para gestión de inventario en campo.',
      'Cliente D', '2026-03-01', '2026-09-01', NOW(), 4, 3, 1,
      ARRAY['React Native', 'Supabase']);