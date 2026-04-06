
-- Create storage bucket for suggestion images
INSERT INTO storage.buckets (id, name, public) VALUES ('sugestoes', 'sugestoes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload suggestion images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sugestoes');

-- Allow public read access
CREATE POLICY "Anyone can view suggestion images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sugestoes');

-- Allow admins to delete suggestion images
CREATE POLICY "Admins can delete suggestion images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sugestoes' AND has_role(auth.uid(), 'admin'::app_role));
