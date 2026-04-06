
CREATE TABLE public.sugestoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  imagem_url TEXT,
  link TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem criar sugestões
CREATE POLICY "Authenticated users can create suggestions"
ON public.sugestoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Apenas admin e operário podem ver todas as sugestões
CREATE POLICY "Admins and operarios can view suggestions"
ON public.sugestoes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

-- Usuários podem ver suas próprias sugestões
CREATE POLICY "Users can view own suggestions"
ON public.sugestoes
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_id);

-- Admin pode deletar sugestões
CREATE POLICY "Admins can delete suggestions"
ON public.sugestoes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
