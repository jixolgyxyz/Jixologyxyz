-- Migration: Insert default project labels
INSERT INTO public.catalogo_etiqueta_proyecto_predeterminada 
  (nombre, descripcion, color_bloque, color_letra)
VALUES
  ('PM',               'Project Manager',  '#7C3AED', '#FFFFFF'),
  ('Frontend',         'Frontend Developer','#2563EB', '#FFFFFF'),
  ('Backend',          'Backend Developer', '#16A34A', '#FFFFFF'),
  ('QA',               'Quality Assurance', '#EA580C', '#FFFFFF'),
  ('Scrum Master',     'Scrum Master',      '#CA8A04', '#FFFFFF'),
  ('Ciberseguridad',   'Ciberseguridad',    '#1E3A5F', '#FFFFFF'),
  ('UX/UI',            'UX/UI Designer',    '#DB2777', '#FFFFFF');

create unique index if not exists invitacion_proyecto_unique_pending
on public.invitacion_proyecto (id_usuario_destino, id_proyecto)
where aceptada = false;