-- Add CHECK constraints to prevent invalid quantities
ALTER TABLE public.produtos ADD CONSTRAINT produtos_quantidade_non_negative CHECK (quantidade >= 0);
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_quantidade_positive CHECK (quantidade > 0 AND quantidade <= 100000);
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_quantidade_positive CHECK (quantidade > 0 AND quantidade <= 100000);
