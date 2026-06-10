CREATE OR REPLACE FUNCTION public.notif_fmt_date(
  p_valor date
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
BEGIN
  IF p_valor IS NULL THEN
    RETURN 'Sin fecha';
  END IF;

  RETURN to_char(p_valor, 'DD')
    || ' '
    || (ARRAY[
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ])[extract(month FROM p_valor)::integer]
    || ' '
    || to_char(p_valor, 'YYYY');
END;
$$;

CREATE OR REPLACE FUNCTION public.notif_fmt_timestamptz(
  p_valor timestamp with time zone,
  p_id_usuario integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_zona text;
  v_fecha_local date;
BEGIN
  IF p_valor IS NULL THEN
    RETURN 'Sin fecha';
  END IF;

  v_zona := public.notif_zona_horaria_usuario(p_id_usuario);
  v_fecha_local := (p_valor AT TIME ZONE v_zona)::date;

  RETURN public.notif_fmt_date(v_fecha_local);
END;
$$;