select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'backlog_item','sprint','usuario_inventario_avatar',
    'usuario_avatar','etiqueta_proyecto_predeterminada',
    'usuario_proyecto_fte','backlog_item_sugerencia_creacion',
    'avatar_style','atributo_avatar','elemento_inventario_avatar',
    'estatus_backlog_item','prioridad_backlog_item','tipo_backlog_item'
  )
order by tablename;

-- List all policies created
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename;