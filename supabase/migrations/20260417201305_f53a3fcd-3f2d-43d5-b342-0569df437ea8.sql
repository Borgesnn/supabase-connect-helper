-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  logo_url TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  endereco TEXT,
  responsavel TEXT,
  categoria TEXT,
  prazo_entrega_dias INTEGER,
  forma_pagamento TEXT,
  avaliacao INTEGER CHECK (avaliacao >= 0 AND avaliacao <= 5),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fornecedores"
  ON public.fornecedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and operarios can manage fornecedores"
  ON public.fornecedores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de anexos
CREATE TABLE public.fornecedor_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo TEXT,
  tamanho_bytes BIGINT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedor_anexos_fornecedor ON public.fornecedor_anexos(fornecedor_id);

ALTER TABLE public.fornecedor_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view anexos"
  ON public.fornecedor_anexos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and operarios can insert anexos"
  ON public.fornecedor_anexos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE POLICY "Admins and operarios can delete anexos"
  ON public.fornecedor_anexos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('fornecedores', 'fornecedores', true);

CREATE POLICY "Public can view fornecedores files"
  ON storage.objects FOR SELECT USING (bucket_id = 'fornecedores');

CREATE POLICY "Admins and operarios can upload fornecedores files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fornecedores' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));

CREATE POLICY "Admins and operarios can update fornecedores files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fornecedores' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));

CREATE POLICY "Admins and operarios can delete fornecedores files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fornecedores' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));