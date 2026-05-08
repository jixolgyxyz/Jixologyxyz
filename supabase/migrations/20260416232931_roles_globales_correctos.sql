DELETE FROM rol_global
WHERE id IN (1, 2, 3);

ALTER TABLE rol_global
ALTER COLUMN descripcion TYPE TEXT;

INSERT INTO rol_global (id, nombre, descripcion) OVERRIDING SYSTEM VALUE VALUES
  (1, 'SAdmin',   'Acceso total y poder crear usuarios con todos los roles'),
  (2, 'Admin', 'Acceso total pero no puede crear mas admins o superadmins'),
  (3, 'Viewer',  'Acceso a proyectos especificos pero no puede editarlos'),
  (4, 'User', 'User general del sistema que solo tiene a acceso a proyectos que estan ligados a su usuario y que pueda trabajar solo en ellos');