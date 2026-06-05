CREATE OR REPLACE FUNCTION public.admin_prepare_email_reverification(
  p_auth_id uuid,
  p_expected_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expected_email text;
BEGIN
  IF p_auth_id IS NULL THEN
    RAISE EXCEPTION 'p_auth_id is required'
      USING ERRCODE = '22023';
  END IF;

  v_expected_email := lower(btrim(p_expected_email));

  IF
    v_expected_email IS NULL
    OR v_expected_email = ''
    OR length(v_expected_email) > 320
    OR strpos(v_expected_email, '@') <= 1
  THEN
    RAISE EXCEPTION 'p_expected_email is invalid'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM auth.users AS users
  WHERE users.id = p_auth_id
    AND lower(btrim(users.email::text)) = v_expected_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user was not found with the expected email'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE auth.users
  SET
    email_confirmed_at = NULL,
    confirmation_token = '',
    confirmation_sent_at = NULL,
    recovery_token = '',
    recovery_sent_at = NULL,
    email_change_token_current = '',
    email_change_token_new = '',
    email_change = '',
    email_change_sent_at = NULL,
    email_change_confirm_status = 0,
    reauthentication_token = '',
    reauthentication_sent_at = NULL,
    updated_at = now()
  WHERE id = p_auth_id;

  -- Keep the email identity consistent with auth.users.email_confirmed_at.
  UPDATE auth.identities
  SET
    identity_data = jsonb_set(
      COALESCE(identity_data, '{}'::jsonb),
      '{email_verified}',
      'false'::jsonb,
      true
    ),
    updated_at = now()
  WHERE user_id = p_auth_id
    AND provider = 'email';

  -- Current GoTrue versions resolve action links through one_time_tokens.
  -- Dynamic SQL keeps the migration compatible with older projects where the
  -- table may not exist and the token columns above are still authoritative.
  IF to_regclass('auth.one_time_tokens') IS NOT NULL THEN
    EXECUTE $delete_tokens$
      DELETE FROM auth.one_time_tokens
      WHERE user_id = $1
        AND token_type::text IN (
          'confirmation_token',
          'recovery_token',
          'email_change_token_new',
          'email_change_token_current',
          'reauthentication_token'
        )
    $delete_tokens$
    USING p_auth_id;
  END IF;
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_prepare_email_reverification(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_prepare_email_reverification(uuid, text)
TO service_role;