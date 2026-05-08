DELETE FROM public.usuario_inventario_avatar
WHERE id_usuario = (
  SELECT id FROM public.usuario
  WHERE email = 'juan.guarnizo@gmail.com'
);
