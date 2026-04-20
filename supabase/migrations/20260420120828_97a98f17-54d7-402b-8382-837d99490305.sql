-- Tabela principal
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'em_negociacao',
  data_solicitacao DATE,
  data_prevista DATE,
  prazo_dias INTEGER,
  quantidade INTEGER,
  valor_estimado NUMERIC(12,2),
  valor_final NUMERIC(12,2),
  responsavel TEXT,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cotacoes_status ON public.cotacoes(status);
CREATE INDEX idx_cotacoes_fornecedor ON public.cotacoes(fornecedor_id);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cotacoes"
  ON public.cotacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and operarios can manage cotacoes"
  ON public.cotacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE TRIGGER update_cotacoes_updated_at
  BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anexos
CREATE TABLE public.cotacao_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo TEXT,
  categoria TEXT DEFAULT 'cotacao',
  tamanho_bytes BIGINT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cotacao_anexos_cotacao ON public.cotacao_anexos(cotacao_id);
ALTER TABLE public.cotacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cotacao anexos"
  ON public.cotacao_anexos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and operarios can insert cotacao anexos"
  ON public.cotacao_anexos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE POLICY "Admins and operarios can delete cotacao anexos"
  ON public.cotacao_anexos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

-- Histórico
CREATE TABLE public.cotacao_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cotacao_historico_cotacao ON public.cotacao_historico(cotacao_id);
ALTER TABLE public.cotacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cotacao historico"
  ON public.cotacao_historico FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and operarios can insert cotacao historico"
  ON public.cotacao_historico FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cotacoes', 'cotacoes', true);

CREATE POLICY "Public can view cotacoes files"
  ON storage.objects FOR SELECT USING (bucket_id = 'cotacoes');

CREATE POLICY "Admins and operarios can upload cotacoes files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cotacoes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));

CREATE POLICY "Admins and operarios can update cotacoes files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cotacoes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));

CREATE POLICY "Admins and operarios can delete cotacoes files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cotacoes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role)));