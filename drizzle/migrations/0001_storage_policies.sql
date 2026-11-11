
CREATE POLICY "Residents upload own attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] IN ('complaints','requests'));
CREATE POLICY "Read permitted attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[2] = 'complaints' AND public.has_permission(auth.uid(), 'view_complaints'))
    OR ((storage.foldername(name))[2] = 'requests' AND public.has_permission(auth.uid(), 'view_requests'))
  ));

CREATE POLICY "Anyone views announcement images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'announcements');
CREATE POLICY "Managers upload announcement images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'announcements' AND public.has_permission(auth.uid(), 'manage_announcements'));
CREATE POLICY "Managers delete announcement images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'announcements' AND public.has_permission(auth.uid(), 'manage_announcements'));

CREATE POLICY "View avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_staff_or_admin(auth.uid())));
CREATE POLICY "Upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
