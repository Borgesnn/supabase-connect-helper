-- Permitir que admins e operários vejam todos os perfis
CREATE POLICY "Admins and operarios can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operario')
);