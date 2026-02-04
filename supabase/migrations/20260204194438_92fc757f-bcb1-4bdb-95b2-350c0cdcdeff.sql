-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true);

-- Política para visualização pública
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'produtos');

-- Política para upload (admins e operários)
CREATE POLICY "Admins and operarios can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'produtos' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operario'))
);

-- Política para atualizar (admins e operários)
CREATE POLICY "Admins and operarios can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'produtos' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operario'))
);

-- Política para deletar (admins e operários)
CREATE POLICY "Admins and operarios can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'produtos' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operario'))
);