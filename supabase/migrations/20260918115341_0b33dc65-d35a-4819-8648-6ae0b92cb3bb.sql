ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS cidade text;

ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS fornecedor_escolhido_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fornecedor_escolhido_nome text,
  ADD COLUMN IF NOT EXISTS valor_escolhido numeric,
  ADD COLUMN IF NOT EXISTS ranking_escolhido integer,
  ADD COLUMN IF NOT EXISTS diferenca_primeiro numeric,
  ADD COLUMN IF NOT EXISTS justificativa_escolha text,
  ADD COLUMN IF NOT EXISTS data_escolha timestamp with time zone,
  ADD COLUMN IF NOT EXISTS escolhido_por uuid;