INSERT INTO public.usuario_inventario_avatar (id_usuario, id_elemento, fecha_obtencion)
SELECT u.id, e.id, NOW()
FROM public.usuario u
CROSS JOIN public.elemento_inventario_avatar e
WHERE u.email = 'juan.guarnizo@gmail.com'
  AND e.id % 2 = 1;