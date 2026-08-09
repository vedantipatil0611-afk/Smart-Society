
CREATE POLICY "auth read complaint imgs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-images');
CREATE POLICY "auth insert own complaint img" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own complaint img" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'complaint-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "auth read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "auth upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "auth read event banners" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-banners');
CREATE POLICY "admin upload event banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update event banners" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete event banners" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-banners' AND public.has_role(auth.uid(), 'admin'));
