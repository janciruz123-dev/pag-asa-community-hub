
CREATE OR REPLACE FUNCTION public.list_accounts(_q text DEFAULT NULL, _role public.app_role DEFAULT NULL, _active boolean DEFAULT NULL, _limit integer DEFAULT 10, _offset integer DEFAULT 0)
RETURNS TABLE (id uuid, full_name text, email text, contact_number text, address text, is_active boolean, created_at timestamptz, roles public.app_role[], permissions public.staff_permission[], total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_permission(auth.uid(), 'view_residents') OR public.is_admin(auth.uid())) THEN
    -- Staff without the resident permission may still list staff for assignment, but nothing else.
    IF NOT (public.is_staff_or_admin(auth.uid()) AND _role = 'staff') THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT p.id, p.full_name, p.email, p.contact_number, p.address, p.is_active, p.created_at,
      COALESCE((SELECT array_agg(ur.role ORDER BY ur.role) FROM public.user_roles ur WHERE ur.user_id = p.id), '{}') AS roles,
      COALESCE((SELECT array_agg(sp.permission ORDER BY sp.permission) FROM public.staff_permissions sp WHERE sp.user_id = p.id), '{}') AS permissions
    FROM public.profiles p
    WHERE (_q IS NULL OR _q = '' OR p.full_name ILIKE '%' || _q || '%' OR p.email ILIKE '%' || _q || '%' OR p.contact_number ILIKE '%' || _q || '%')
      AND (_active IS NULL OR p.is_active = _active)
      AND (_role IS NULL OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = _role))
  )
  SELECT b.id, b.full_name, b.email, b.contact_number, b.address, b.is_active, b.created_at, b.roles, b.permissions, count(*) OVER () AS total
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200) OFFSET GREATEST(_offset, 0);
END; $$;
REVOKE EXECUTE ON FUNCTION public.list_accounts(text, public.app_role, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_accounts(text, public.app_role, boolean, integer, integer) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
