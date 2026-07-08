
CREATE POLICY "mv_bucket_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materiais-visuais');
CREATE POLICY "mv_bucket_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materiais-visuais');
CREATE POLICY "mv_bucket_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materiais-visuais');
CREATE POLICY "mv_bucket_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materiais-visuais');

CREATE POLICY "art_bucket_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artes-referencias');
CREATE POLICY "art_bucket_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artes-referencias');
CREATE POLICY "art_bucket_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'artes-referencias');
