CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _name text := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  _is_staff_account boolean := COALESCE((NEW.raw_app_meta_data->>'created_by_admin')::boolean, false);
BEGIN
  IF char_length(_name) < 2 THEN _name := _name || ' User'; END IF;
  INSERT INTO public.profiles(id, full_name, email, contact_number, address, privacy_consent_at)
  VALUES (
    NEW.id, left(_name, 120), NEW.email,
    left(NULLIF(NEW.raw_user_meta_data->>'contact_number', ''), 20),
    left(NULLIF(NEW.raw_user_meta_data->>'address', ''), 300),
    CASE WHEN (NEW.raw_user_meta_data->>'privacy_consent')::boolean THEN now() ELSE NULL END
  );

  -- Every public sign-up is a resident. Admin/staff roles are only granted by an
  -- existing administrator, or (for the very first admin) by the system owner's setup code.
  IF NOT _is_staff_account THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'resident');
  END IF;

  PERFORM public.write_log(NEW.id, 'account.created', 'Account created for ' || left(_name, 120), 'profile', NEW.id);
  RETURN NEW;
END; $function$;

-- Only reveals whether first-time administrator setup is still available (no admin yet).
CREATE OR REPLACE FUNCTION public.admin_setup_open()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$ SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;

REVOKE ALL ON FUNCTION public.admin_setup_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_setup_open() TO anon, authenticated, service_role;