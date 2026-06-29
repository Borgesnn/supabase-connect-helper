
CREATE TABLE public.marcas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marcas TO authenticated;
GRANT ALL ON public.marcas TO service_role;

ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver marcas"
  ON public.marcas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Operario podem inserir marcas"
  ON public.marcas FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE POLICY "Admin/Operario podem atualizar marcas"
  ON public.marcas FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE POLICY "Admin pode excluir marcas"
  ON public.marcas FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.produtos
  ADD COLUMN marca_id UUID REFERENCES public.marcas(id) ON DELETE SET NULL;

CREATE INDEX idx_produtos_marca_id ON public.produtos(marca_id);

INSERT INTO public.marcas (nome) VALUES
  ('Volvo'), ('Manitou'), ('SDLG'), ('Massey Ferguson')
ON CONFLICT (nome) DO NOTHING;
