
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS objetivo text,
  ADD COLUMN IF NOT EXISTS setor text,
  ADD COLUMN IF NOT EXISTS solicitante text;

CREATE TABLE IF NOT EXISTS public.cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'un',
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_itens TO authenticated;
GRANT ALL ON public.cotacao_itens TO service_role;
ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cotacao itens" ON public.cotacao_itens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e editores gerenciam cotacao itens" ON public.cotacao_itens
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));
CREATE TRIGGER update_cotacao_itens_updated_at BEFORE UPDATE ON public.cotacao_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cotacao_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text NOT NULL,
  frete numeric NOT NULL DEFAULT 0,
  instalacao numeric NOT NULL DEFAULT 0,
  outros_custos numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  prazo_dias integer,
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_fornecedores TO authenticated;
GRANT ALL ON public.cotacao_fornecedores TO service_role;
ALTER TABLE public.cotacao_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cotacao fornecedores" ON public.cotacao_fornecedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e editores gerenciam cotacao fornecedores" ON public.cotacao_fornecedores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));
CREATE TRIGGER update_cotacao_fornecedores_updated_at BEFORE UPDATE ON public.cotacao_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cotacao_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_fornecedor_id uuid NOT NULL REFERENCES public.cotacao_fornecedores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.cotacao_itens(id) ON DELETE CASCADE,
  valor_unitario numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_fornecedor_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_precos TO authenticated;
GRANT ALL ON public.cotacao_precos TO service_role;
ALTER TABLE public.cotacao_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cotacao precos" ON public.cotacao_precos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e editores gerenciam cotacao precos" ON public.cotacao_precos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));
CREATE TRIGGER update_cotacao_precos_updated_at BEFORE UPDATE ON public.cotacao_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cotacao ON public.cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_fornecedores_cotacao ON public.cotacao_fornecedores(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_precos_forn ON public.cotacao_precos(cotacao_fornecedor_id);
