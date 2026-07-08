
ALTER TABLE public.movimentacoes DROP CONSTRAINT movimentacoes_usuario_id_fkey,
  ADD CONSTRAINT movimentacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_solicitante_id_fkey,
  ADD CONSTRAINT pedidos_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_aprovador_id_fkey,
  ADD CONSTRAINT pedidos_aprovador_id_fkey FOREIGN KEY (aprovador_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE public.pedidos ALTER COLUMN solicitante_id DROP NOT NULL;
