-- 1. Function execute privileges: no anon, no PUBLIC
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.prorettype = 'trigger'::regtype AS is_trigger
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2. profiles policies -> authenticated only
DROP POLICY IF EXISTS "Admins and operarios can view all profiles" ON public.profiles;
CREATE POLICY "Admins and operarios can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3. user_roles policies -> authenticated only
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. pedidos finalize policy
DROP POLICY IF EXISTS "Users can finalize their own orders" ON public.pedidos;
CREATE POLICY "Users can finalize their own orders" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (auth.uid() = solicitante_id AND status = 'aprovada'::text)
  WITH CHECK (auth.uid() = solicitante_id AND status = 'concluido'::text);

-- 5. arte_solicitacoes update: no always-true WITH CHECK
DROP POLICY IF EXISTS arte_update ON public.arte_solicitacoes;
CREATE POLICY arte_update ON public.arte_solicitacoes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
    OR (solicitante_id = auth.uid() AND status = 'aguardando'::arte_status)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
    OR (solicitante_id = auth.uid() AND status = 'aguardando'::arte_status)
  );

-- 6. helper: first path segment as uuid (null-safe)
CREATE OR REPLACE FUNCTION public.storage_folder_uuid(_name text, _idx int DEFAULT 1)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  v := (string_to_array(_name, '/'))[_idx];
  IF v IS NULL THEN RETURN NULL; END IF;
  RETURN v::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.storage_folder_uuid(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_folder_uuid(text,int) TO authenticated, service_role;

-- 7. sugestoes bucket -> private + ownership scoped
DROP POLICY IF EXISTS "Anyone can view suggestion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload suggestion images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete suggestion images" ON storage.objects;

CREATE POLICY "sugestoes_read_own_or_staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sugestoes'
    AND (
      has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
      OR public.storage_folder_uuid(name) = auth.uid()
    )
  );

CREATE POLICY "sugestoes_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sugestoes' AND public.storage_folder_uuid(name) = auth.uid());

CREATE POLICY "sugestoes_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sugestoes'
    AND (has_role(auth.uid(),'admin'::app_role) OR public.storage_folder_uuid(name) = auth.uid())
  );

-- 8. produtos bucket: staff-only writes scoped to authenticated role
DROP POLICY IF EXISTS "Admins and operarios can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and operarios can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and operarios can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view product images" ON storage.objects;

CREATE POLICY "produtos_staff_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produtos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));
CREATE POLICY "produtos_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'produtos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)))
  WITH CHECK (bucket_id = 'produtos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));
CREATE POLICY "produtos_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'produtos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));
CREATE POLICY "produtos_read_visible" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'produtos'
    AND (
      has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.produtos p
        WHERE p.imagem_url LIKE '%' || objects.name
          AND public.user_can_see_produto(auth.uid(), p.id)
      )
    )
  );

-- 9. fornecedores bucket: attachments scoped to existing fornecedor
DROP POLICY IF EXISTS "Authenticated can view fornecedores files" ON storage.objects;
CREATE POLICY "fornecedores_read_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fornecedores'
    AND (
      has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
      OR (string_to_array(name,'/'))[1] = 'logos'
      OR EXISTS (
        SELECT 1 FROM public.fornecedores f
        WHERE f.id = public.storage_folder_uuid(objects.name, 2)
      )
    )
  );

-- 10. cotacoes bucket: scoped to a cotacao the user can see
DROP POLICY IF EXISTS "Authenticated can view cotacoes files" ON storage.objects;
CREATE POLICY "cotacoes_read_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cotacoes'
    AND EXISTS (
      SELECT 1 FROM public.cotacoes c
      WHERE c.id = public.storage_folder_uuid(objects.name)
    )
  );

-- 11. materiais-visuais bucket: read only what the user can see
DROP POLICY IF EXISTS mv_bucket_auth_read ON storage.objects;
DROP POLICY IF EXISTS mv_bucket_auth_write ON storage.objects;
DROP POLICY IF EXISTS mv_bucket_auth_update ON storage.objects;
DROP POLICY IF EXISTS mv_bucket_auth_delete ON storage.objects;

CREATE POLICY mv_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiais-visuais'
    AND (
      has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.materiais_visuais m
        WHERE m.foto_path = objects.name AND public.user_can_see_material(auth.uid(), m.id)
      )
    )
  );
CREATE POLICY mv_bucket_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materiais-visuais' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));
CREATE POLICY mv_bucket_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materiais-visuais' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)))
  WITH CHECK (bucket_id = 'materiais-visuais' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));
CREATE POLICY mv_bucket_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiais-visuais' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)));

-- 12. artes-referencias bucket: scoped to the related solicitation
DROP POLICY IF EXISTS art_bucket_auth_read ON storage.objects;
DROP POLICY IF EXISTS art_bucket_auth_write ON storage.objects;
DROP POLICY IF EXISTS art_bucket_auth_delete ON storage.objects;

CREATE POLICY art_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'artes-referencias'
    AND EXISTS (
      SELECT 1 FROM public.arte_solicitacoes s
      WHERE s.id = public.storage_folder_uuid(objects.name)
        AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
    )
  );
CREATE POLICY art_bucket_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artes-referencias'
    AND EXISTS (
      SELECT 1 FROM public.arte_solicitacoes s
      WHERE s.id = public.storage_folder_uuid(objects.name)
        AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
    )
  );
CREATE POLICY art_bucket_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'artes-referencias'
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.arte_solicitacoes s
        WHERE s.id = public.storage_folder_uuid(objects.name) AND s.solicitante_id = auth.uid()
      )
    )
  );