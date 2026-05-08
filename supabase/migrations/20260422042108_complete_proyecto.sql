ALTER TABLE proyecto
  ALTER COLUMN fecha_creacion SET DEFAULT now();

ALTER TABLE proyecto
  ALTER COLUMN dependencia_externa SET DEFAULT false;

UPDATE proyecto
SET dependencia_externa = false
WHERE dependencia_externa IS NULL;

ALTER TABLE proyecto
  ALTER COLUMN dependencia_externa SET NOT NULL;

UPDATE proyecto
SET stack_tecnologico = '{}'
WHERE stack_tecnologico IS NULL;

ALTER TABLE proyecto
  ALTER COLUMN stack_tecnologico SET DEFAULT '{}';

ALTER TABLE proyecto
  ALTER COLUMN stack_tecnologico SET NOT NULL;