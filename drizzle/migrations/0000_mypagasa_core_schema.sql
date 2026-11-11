
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'resident');
CREATE TYPE public.staff_permission AS ENUM (
  'view_complaints', 'review_complaints', 'update_assigned_complaints',
  'view_requests', 'process_requests', 'view_residents', 'manage_announcements'
);
CREATE TYPE public.complaint_status AS ENUM ('pending','under_review','in_progress','resolved','closed','rejected');
CREATE TYPE public.request_status AS ENUM ('pending','under_review','approved','rejected','completed');
CREATE TYPE public.announcement_status AS ENUM ('draft','published');

-- ===== Generic updated_at =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text,
  contact_number text CHECK (contact_number IS NULL OR char_length(contact_number) <= 20),
  address text CHECK (address IS NULL OR char_length(address) <= 300),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  privacy_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX profiles_created_idx ON public.profiles(created_at DESC);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_roles_user_idx ON public.user_roles(user_id);

CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission public.staff_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, DELETE ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX staff_permissions_user_idx ON public.staff_permissions(user_id);

-- ===== Role helper functions =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'))
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm public.staff_permission)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR (
    public.has_role(_user_id, 'staff')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.is_active)
    AND EXISTS (SELECT 1 FROM public.staff_permissions sp WHERE sp.user_id = _user_id AND sp.permission = _perm)
  )
$$;

-- ===== Activity logs =====
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_logs_created_idx ON public.activity_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.write_log(_actor uuid, _action text, _description text, _entity_type text, _entity_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_logs(actor_id, action, description, entity_type, entity_id)
  VALUES (CASE WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = _actor) THEN _actor ELSE NULL END,
          _action, _description, _entity_type, _entity_id);
$$;
REVOKE EXECUTE ON FUNCTION public.write_log(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- ===== Notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_idx ON public.notifications(user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify(_user uuid, _title text, _message text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications(user_id, title, message, link) VALUES (_user, _title, _message, _link);
$$;
REVOKE EXECUTE ON FUNCTION public.notify(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- ===== Signup handling =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF NOT _is_staff_account THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'resident');
  END IF;

  -- Bootstrap: the very first account becomes the administrator when none exists yet.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
    PERFORM public.write_log(NEW.id, 'account.bootstrap_admin', 'First account registered and granted administrator access', 'profile', NEW.id);
  END IF;

  PERFORM public.write_log(NEW.id, 'account.created', 'Account created for ' || left(_name, 120), 'profile', NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Protect sensitive profile columns from non-admins
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.is_active := OLD.is_active;
    NEW.email := OLD.email;
    NEW.privacy_consent_at := OLD.privacy_consent_at;
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    PERFORM public.write_log(auth.uid(),
      CASE WHEN NEW.is_active THEN 'account.activated' ELSE 'account.deactivated' END,
      (CASE WHEN NEW.is_active THEN 'Activated' ELSE 'Deactivated' END) || ' account of ' || NEW.full_name, 'profile', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- Log role changes and protect last admin
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.user_id;
    IF auth.uid() IS NOT NULL THEN
      PERFORM public.write_log(auth.uid(), 'role.granted', 'Granted ' || NEW.role || ' role to ' || COALESCE(_name, 'user'), 'profile', NEW.user_id);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.role = 'admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator';
    END IF;
    SELECT full_name INTO _name FROM public.profiles WHERE id = OLD.user_id;
    PERFORM public.write_log(auth.uid(), 'role.revoked', 'Removed ' || OLD.role || ' role from ' || COALESCE(_name, 'user'), 'profile', OLD.user_id);
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER user_roles_log_ins AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
CREATE TRIGGER user_roles_log_del BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_log(auth.uid(), 'permission.granted', 'Granted permission "' || NEW.permission || '" to ' || COALESCE(_name,'staff'), 'profile', NEW.user_id);
    RETURN NEW;
  ELSE
    PERFORM public.write_log(auth.uid(), 'permission.revoked', 'Removed permission "' || OLD.permission || '" from ' || COALESCE(_name,'staff'), 'profile', OLD.user_id);
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER staff_perm_log AFTER INSERT OR DELETE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

-- ===== Policies: profiles / roles / permissions / logs / notifications =====
CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Staff can read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_residents') OR public.has_permission(auth.uid(), 'view_complaints') OR public.has_permission(auth.uid(), 'view_requests') OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Own profile updatable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins revoke roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Own permissions readable" ON public.staff_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins grant permissions" ON public.staff_permissions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins revoke permissions" ON public.staff_permissions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins read activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Complaints =====
CREATE SEQUENCE public.complaint_ref_seq;
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE,
  resident_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  category text NOT NULL CHECK (category IN ('Noise disturbance','Community cleanliness','Public disturbance','Neighborhood concerns','Road and drainage concerns','Safety concerns','Other')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  location text NOT NULL CHECK (char_length(location) BETWEEN 3 AND 300),
  incident_date date NOT NULL,
  status public.complaint_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  latest_remark text CHECK (latest_remark IS NULL OR char_length(latest_remark) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE INDEX complaints_resident_idx ON public.complaints(resident_id, created_at DESC);
CREATE INDEX complaints_status_idx ON public.complaints(status);
CREATE INDEX complaints_created_idx ON public.complaints(created_at DESC);
CREATE INDEX complaints_assigned_idx ON public.complaints(assigned_to);

CREATE TABLE public.complaint_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.complaint_attachments TO authenticated;
GRANT ALL ON public.complaint_attachments TO service_role;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX complaint_attachments_c_idx ON public.complaint_attachments(complaint_id);

CREATE TABLE public.complaint_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status public.complaint_status NOT NULL,
  remark text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.complaint_status_history TO authenticated;
GRANT ALL ON public.complaint_status_history TO service_role;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX complaint_history_c_idx ON public.complaint_status_history(complaint_id, created_at);

CREATE OR REPLACE FUNCTION public.complaint_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.reference_no := 'CMP-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY') || '-' || lpad(nextval('public.complaint_ref_seq')::text, 5, '0');
  NEW.status := 'pending';
  NEW.assigned_to := NULL;
  NEW.latest_remark := NULL;
  IF NEW.incident_date > (now() AT TIME ZONE 'Asia/Manila')::date THEN
    RAISE EXCEPTION 'Date of incident cannot be in the future';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER complaints_bi BEFORE INSERT ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.complaint_before_insert();

CREATE OR REPLACE FUNCTION public.complaint_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.complaint_status_history(complaint_id, status, remark, changed_by)
  VALUES (NEW.id, 'pending', 'Complaint submitted', NEW.resident_id);
  PERFORM public.write_log(NEW.resident_id, 'complaint.submitted', 'Submitted complaint ' || NEW.reference_no || ': ' || NEW.title, 'complaint', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER complaints_ai AFTER INSERT ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.complaint_after_insert();

CREATE OR REPLACE FUNCTION public.complaint_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text;
BEGIN
  -- Only admins may change assignment; nobody changes the resident's submitted content here.
  NEW.reference_no := OLD.reference_no;
  NEW.resident_id := OLD.resident_id;
  NEW.title := OLD.title; NEW.category := OLD.category; NEW.description := OLD.description;
  NEW.location := OLD.location; NEW.incident_date := OLD.incident_date; NEW.created_at := OLD.created_at;
  IF NOT public.is_admin(auth.uid()) THEN NEW.assigned_to := OLD.assigned_to; END IF;
  NEW.updated_at := now();

  _label := initcap(replace(NEW.status::text, '_', ' '));
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.complaint_status_history(complaint_id, status, remark, changed_by)
    VALUES (NEW.id, NEW.status, NULLIF(NEW.latest_remark, OLD.latest_remark), auth.uid());
    PERFORM public.notify(NEW.resident_id, 'Complaint status updated',
      'Your complaint ' || NEW.reference_no || ' is now ' || _label || '.', '/complaints/' || NEW.id);
    PERFORM public.write_log(auth.uid(), 'complaint.status_changed', 'Changed ' || NEW.reference_no || ' status to ' || _label, 'complaint', NEW.id);
  ELSIF NEW.latest_remark IS DISTINCT FROM OLD.latest_remark AND NEW.latest_remark IS NOT NULL THEN
    INSERT INTO public.complaint_status_history(complaint_id, status, remark, changed_by)
    VALUES (NEW.id, NEW.status, NEW.latest_remark, auth.uid());
    PERFORM public.notify(NEW.resident_id, 'New remark on your complaint',
      'The barangay added a remark on ' || NEW.reference_no || '.', '/complaints/' || NEW.id);
    PERFORM public.write_log(auth.uid(), 'complaint.remark_added', 'Added remark to ' || NEW.reference_no, 'complaint', NEW.id);
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM public.write_log(auth.uid(), 'complaint.assigned', 'Updated assignment of ' || NEW.reference_no, 'complaint', NEW.id);
    IF NEW.assigned_to IS NOT NULL THEN
      PERFORM public.notify(NEW.assigned_to, 'Complaint assigned to you', NEW.reference_no || ': ' || NEW.title, '/admin/complaints/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER complaints_bu BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.complaint_before_update();

CREATE POLICY "Residents read own complaints" ON public.complaints FOR SELECT TO authenticated USING (resident_id = auth.uid());
CREATE POLICY "Staff read complaints" ON public.complaints FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_complaints'));
CREATE POLICY "Residents submit complaints" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (resident_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active));
CREATE POLICY "Reviewers update complaints" ON public.complaints FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'review_complaints') OR (assigned_to = auth.uid() AND public.has_permission(auth.uid(), 'update_assigned_complaints')))
  WITH CHECK (public.has_permission(auth.uid(), 'review_complaints') OR (assigned_to = auth.uid() AND public.has_permission(auth.uid(), 'update_assigned_complaints')));
CREATE POLICY "Admins delete complaints" ON public.complaints FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Read attachments of visible complaints" ON public.complaint_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id));
CREATE POLICY "Owner adds complaint attachments" ON public.complaint_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.resident_id = auth.uid()));
CREATE POLICY "Read history of visible complaints" ON public.complaint_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id));

-- ===== Service categories & requests =====
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 3 AND 100),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  requirements text CHECK (requirements IS NULL OR char_length(requirements) <= 1000),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER service_categories_updated BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Anyone reads active services" ON public.service_categories FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage services ins" ON public.service_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage services upd" ON public.service_categories FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage services del" ON public.service_categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.service_categories(name, description, requirements, sort_order) VALUES
 ('Barangay Clearance', 'Certification that the resident has no derogatory record in the barangay.', 'Valid ID; proof of residency', 1),
 ('Certificate of Indigency', 'Certification of financial status for assistance applications.', 'Valid ID; brief statement of purpose', 2),
 ('Certificate of Residency', 'Certification that the applicant resides in Barangay Pag-asa.', 'Valid ID; proof of address', 3),
 ('Barangay Certificate', 'General barangay certification for various purposes.', 'Valid ID', 4),
 ('Other Barangay Services', 'Other requests handled by the barangay office.', 'Describe your request in detail', 5);

CREATE SEQUENCE public.request_ref_seq;
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE,
  resident_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 5 AND 500),
  additional_info text CHECK (additional_info IS NULL OR char_length(additional_info) <= 2000),
  status public.request_status NOT NULL DEFAULT 'pending',
  admin_remarks text CHECK (admin_remarks IS NULL OR char_length(admin_remarks) <= 2000),
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX service_requests_resident_idx ON public.service_requests(resident_id, created_at DESC);
CREATE INDEX service_requests_status_idx ON public.service_requests(status);
CREATE INDEX service_requests_created_idx ON public.service_requests(created_at DESC);

CREATE TABLE public.service_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.service_request_attachments TO authenticated;
GRANT ALL ON public.service_request_attachments TO service_role;
ALTER TABLE public.service_request_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX service_request_attachments_r_idx ON public.service_request_attachments(request_id);

CREATE TABLE public.service_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  status public.request_status NOT NULL,
  remark text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_request_status_history TO authenticated;
GRANT ALL ON public.service_request_status_history TO service_role;
ALTER TABLE public.service_request_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_history_r_idx ON public.service_request_status_history(request_id, created_at);

CREATE OR REPLACE FUNCTION public.request_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.service_categories WHERE id = NEW.category_id AND is_active) THEN
    RAISE EXCEPTION 'Selected service is not available';
  END IF;
  NEW.reference_no := 'SRQ-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY') || '-' || lpad(nextval('public.request_ref_seq')::text, 5, '0');
  NEW.status := 'pending';
  NEW.admin_remarks := NULL;
  NEW.processed_by := NULL;
  RETURN NEW;
END; $$;
CREATE TRIGGER service_requests_bi BEFORE INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.request_before_insert();

CREATE OR REPLACE FUNCTION public.request_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _svc text;
BEGIN
  SELECT name INTO _svc FROM public.service_categories WHERE id = NEW.category_id;
  INSERT INTO public.service_request_status_history(request_id, status, remark, changed_by)
  VALUES (NEW.id, 'pending', 'Request submitted', NEW.resident_id);
  PERFORM public.write_log(NEW.resident_id, 'request.submitted', 'Submitted ' || COALESCE(_svc,'service') || ' request ' || NEW.reference_no, 'service_request', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER service_requests_ai AFTER INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.request_after_insert();

CREATE OR REPLACE FUNCTION public.request_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text;
BEGIN
  NEW.reference_no := OLD.reference_no; NEW.resident_id := OLD.resident_id; NEW.category_id := OLD.category_id;
  NEW.purpose := OLD.purpose; NEW.additional_info := OLD.additional_info; NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  _label := initcap(replace(NEW.status::text, '_', ' '));
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('completed','rejected') AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only an administrator can reopen a finished request';
    END IF;
    IF NEW.status = 'completed' AND OLD.status <> 'approved' THEN
      RAISE EXCEPTION 'A request must be approved before it can be completed';
    END IF;
    NEW.processed_by := auth.uid();
    INSERT INTO public.service_request_status_history(request_id, status, remark, changed_by)
    VALUES (NEW.id, NEW.status, NULLIF(NEW.admin_remarks, OLD.admin_remarks), auth.uid());
    PERFORM public.notify(NEW.resident_id, 'Service request updated',
      'Your request ' || NEW.reference_no || ' is now ' || _label || '.', '/requests/' || NEW.id);
    PERFORM public.write_log(auth.uid(),
      CASE NEW.status WHEN 'approved' THEN 'request.approved' WHEN 'rejected' THEN 'request.rejected' WHEN 'completed' THEN 'request.completed' ELSE 'request.status_changed' END,
      'Changed ' || NEW.reference_no || ' status to ' || _label, 'service_request', NEW.id);
  ELSIF NEW.admin_remarks IS DISTINCT FROM OLD.admin_remarks AND NEW.admin_remarks IS NOT NULL THEN
    INSERT INTO public.service_request_status_history(request_id, status, remark, changed_by)
    VALUES (NEW.id, NEW.status, NEW.admin_remarks, auth.uid());
    PERFORM public.notify(NEW.resident_id, 'New remark on your request',
      'The barangay added a remark on ' || NEW.reference_no || '.', '/requests/' || NEW.id);
    PERFORM public.write_log(auth.uid(), 'request.remark_added', 'Added remark to ' || NEW.reference_no, 'service_request', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER service_requests_bu BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.request_before_update();

CREATE POLICY "Residents read own requests" ON public.service_requests FOR SELECT TO authenticated USING (resident_id = auth.uid());
CREATE POLICY "Staff read requests" ON public.service_requests FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_requests'));
CREATE POLICY "Residents submit requests" ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (resident_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active));
CREATE POLICY "Processors update requests" ON public.service_requests FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'process_requests')) WITH CHECK (public.has_permission(auth.uid(), 'process_requests'));
CREATE POLICY "Admins delete requests" ON public.service_requests FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Read attachments of visible requests" ON public.service_request_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id));
CREATE POLICY "Owner adds request attachments" ON public.service_request_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.resident_id = auth.uid()));
CREATE POLICY "Read history of visible requests" ON public.service_request_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id));

-- ===== Announcements =====
CREATE TABLE public.announcement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 3 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcement_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_categories TO authenticated;
GRANT ALL ON public.announcement_categories TO service_role;
ALTER TABLE public.announcement_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads announcement categories" ON public.announcement_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers add categories" ON public.announcement_categories FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers edit categories" ON public.announcement_categories FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'manage_announcements')) WITH CHECK (public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers delete categories" ON public.announcement_categories FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'manage_announcements'));

INSERT INTO public.announcement_categories(name) VALUES
 ('Community Updates'), ('Events and Activities'), ('Public Advisories'), ('Health and Safety'), ('Important Notices');

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 10000),
  category_id uuid REFERENCES public.announcement_categories(id) ON DELETE SET NULL,
  image_url text,
  author_office text NOT NULL DEFAULT 'Barangay Pag-asa Office' CHECK (char_length(author_office) <= 120),
  status public.announcement_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE INDEX announcements_pub_idx ON public.announcements(status, published_at DESC);

CREATE OR REPLACE FUNCTION public.announcement_before_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSE
    NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status <> 'published') THEN
    NEW.published_at := now();
  ELSIF NEW.status = 'draft' THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER announcements_bw BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.announcement_before_write();

CREATE OR REPLACE FUNCTION public.announcement_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.write_log(auth.uid(), 'announcement.deleted', 'Deleted announcement "' || OLD.title || '"', 'announcement', OLD.id);
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_log(auth.uid(), 'announcement.created', 'Created announcement "' || NEW.title || '"', 'announcement', NEW.id);
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status <> 'published') THEN
    PERFORM public.write_log(auth.uid(), 'announcement.published', 'Published announcement "' || NEW.title || '"', 'announcement', NEW.id);
    INSERT INTO public.notifications(user_id, title, message, link)
    SELECT ur.user_id, 'New announcement', NEW.title, '/announcements/' || NEW.id
    FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'resident' AND p.is_active;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'draft' AND OLD.status = 'published' THEN
    PERFORM public.write_log(auth.uid(), 'announcement.unpublished', 'Unpublished announcement "' || NEW.title || '"', 'announcement', NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_log(auth.uid(), 'announcement.updated', 'Edited announcement "' || NEW.title || '"', 'announcement', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER announcements_aw AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.announcement_after_write();

CREATE POLICY "Anyone reads published announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Managers read all announcements" ON public.announcements FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers edit announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'manage_announcements')) WITH CHECK (public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'manage_announcements'));

-- ===== Dashboard stats (staff/admin only) =====
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT jsonb_build_object(
    'residents', (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'resident'),
    'complaints_total', (SELECT count(*) FROM public.complaints),
    'complaints_by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.complaints GROUP BY status) s), '{}'::jsonb),
    'complaints_by_category', COALESCE((SELECT jsonb_object_agg(category, n) FROM (SELECT category, count(*) n FROM public.complaints GROUP BY category) s), '{}'::jsonb),
    'requests_total', (SELECT count(*) FROM public.service_requests),
    'requests_by_status', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.service_requests GROUP BY status) s), '{}'::jsonb),
    'requests_by_service', COALESCE((SELECT jsonb_object_agg(sc.name, n) FROM (SELECT category_id, count(*) n FROM public.service_requests GROUP BY category_id) s JOIN public.service_categories sc ON sc.id = s.category_id), '{}'::jsonb),
    'announcements_published', (SELECT count(*) FROM public.announcements WHERE status = 'published'),
    'announcements_draft', (SELECT count(*) FROM public.announcements WHERE status = 'draft')
  ) INTO _r;
  RETURN _r;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- Internal trigger functions should not be callable directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
