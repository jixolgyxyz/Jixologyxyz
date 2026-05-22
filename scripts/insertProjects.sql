-- Proyectos dummy con todos los datos de "Planeación y métricas" y
-- "Clasificación" llenos.
--
-- Catálogos (ver 20260423033426_create_proyecto_catalogs.sql):
--   divisa:               1 = Peso mexicano (MXN), 2 = Dólar (USD)
--   modelo_facturacion:   1 = Precio fijo, 2 = Tiempo y materiales, 3 = Bolsa de horas
--   complejidad_proyecto: 1 = Baja, 2 = Media, 3 = Alta
--   tipo_proyecto:        1 = Desarrollo, 2 = Implementación, 3 = Mantenimiento, 4 = Consultoría

INSERT INTO proyecto (
  nombre, descripcion, cliente, fecha_inicial, fecha_final, fecha_creacion,
  dependencia_externa, hitos_estimados,
  presupuesto, id_divisa_presupuesto, costo_mensual, id_divisa_costo,
  tolerancia_desviacion, peso_presupuesto, peso_retraso,
  id_modelo_facturacion, id_complejidad, id_tipo,
  id_estatus, id_metodologia, id_creador, stack_tecnologico
)
OVERRIDING SYSTEM VALUE VALUES
  ('Proyecto Alpha',
      'Migración completa del sistema legacy a arquitectura moderna.',
      'Mahindra', '2025-09-01', '2026-06-01', NOW(),
      false, 8,
      850000.00, 1, 95000.00, 1,
      10.00, 0.60, 0.40,
      1, 3, 1,
      1, 1, 1,
      ARRAY['React', 'Supabase', 'TypeScript']),

  ('Proyecto Beta',
      'Módulo de reportes financieros con exportación a PDF y Excel.',
      'Cliente B', '2025-11-01', '2026-08-15', NOW(),
      false, 5,
      420000.00, 1, 60000.00, 1,
      15.00, 0.50, 0.50,
      2, 2, 1,
      2, 2, 1,
      ARRAY['Vue', 'Node.js', 'PostgreSQL']),

  ('Proyecto Gamma',
      'Integración con API de pagos externos. Bloqueado por proveedor.',
      'Cliente C', '2025-12-01', '2026-05-10', NOW(),
      true, 4,
      25000.00, 2, 4000.00, 2,
      8.00, 0.45, 0.55,
      3, 3, 2,
      3, 1, 1,
      ARRAY['React', 'Stripe', 'Express']),

  ('Proyecto Delta',
      'App móvil para gestión de inventario en campo.',
      'Cliente D', '2026-03-01', '2026-09-01', NOW(),
      false, 6,
      540000.00, 1, 72000.00, 1,
      12.00, 0.55, 0.45,
      1, 2, 1,
      4, 3, 1,
      ARRAY['React Native', 'Supabase']);
