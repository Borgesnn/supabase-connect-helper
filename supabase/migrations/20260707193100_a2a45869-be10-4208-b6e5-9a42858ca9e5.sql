
-- 1) Catálogo de tamanhos
CREATE TABLE public.tamanhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tamanhos TO authenticated;
GRANT ALL ON public.tamanhos TO service_role;
ALTER TABLE public.tamanhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tamanhos legíveis por autenticados" ON public.tamanhos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam tamanhos" ON public.tamanhos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.tamanhos (nome, ordem) VALUES
  ('PP', 1), ('P', 2), ('M', 3), ('G', 4), ('GG', 5), ('XG', 6), ('XGG', 7);

-- 2) Flag no produto
ALTER TABLE public.produtos
  ADD COLUMN controla_tamanho boolean NOT NULL DEFAULT false;

-- 3) Estoque por tamanho
CREATE TABLE public.produto_tamanhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tamanho_id uuid NOT NULL REFERENCES public.tamanhos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  estoque_minimo integer NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, tamanho_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_tamanhos TO authenticated;
GRANT ALL ON public.produto_tamanhos TO service_role;
ALTER TABLE public.produto_tamanhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produto_tamanhos legíveis conforme produto" ON public.produto_tamanhos
  FOR SELECT TO authenticated
  USING (public.user_can_see_produto(auth.uid(), produto_id));
CREATE POLICY "Admin/operário gerenciam produto_tamanhos" ON public.produto_tamanhos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operario'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operario'::app_role));

CREATE TRIGGER trg_pt_updated BEFORE UPDATE ON public.produto_tamanhos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para manter produtos.quantidade = SUM(produto_tamanhos) quando controla_tamanho
CREATE OR REPLACE FUNCTION public.sync_produto_total_quantidade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_produto uuid;
BEGIN
  v_produto := COALESCE(NEW.produto_id, OLD.produto_id);
  UPDATE public.produtos p
    SET quantidade = COALESCE((SELECT SUM(quantidade) FROM public.produto_tamanhos WHERE produto_id = v_produto), 0)
    WHERE p.id = v_produto AND p.controla_tamanho = true;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_pt_sync_total
AFTER INSERT OR UPDATE OR DELETE ON public.produto_tamanhos
FOR EACH ROW EXECUTE FUNCTION public.sync_produto_total_quantidade();

-- 4) Itens de pedido (múltiplos tamanhos)
CREATE TABLE public.pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  tamanho_id uuid REFERENCES public.tamanhos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_itens TO authenticated;
GRANT ALL ON public.pedido_itens TO service_role;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedido_itens visíveis com o pedido" ON public.pedido_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos pd WHERE pd.id = pedido_id
                 AND (pd.solicitante_id = auth.uid()
                      OR public.has_role(auth.uid(),'admin'::app_role)
                      OR public.has_role(auth.uid(),'operario'::app_role))));
CREATE POLICY "Solicitante insere itens do próprio pedido" ON public.pedido_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos pd WHERE pd.id = pedido_id AND pd.solicitante_id = auth.uid()));
CREATE POLICY "Admin/operário gerenciam pedido_itens" ON public.pedido_itens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operario'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operario'::app_role));

-- 5) Tamanho em movimentações
ALTER TABLE public.movimentacoes
  ADD COLUMN tamanho_id uuid REFERENCES public.tamanhos(id) ON DELETE RESTRICT;

-- 6) RPC de movimentação atualizada (nova assinatura com p_tamanho_id)
CREATE OR REPLACE FUNCTION public.register_movement_atomic(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_observacao text,
  p_setor text,
  p_usuario_id uuid,
  p_tamanho_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_controla boolean;
  v_nova_quantidade integer;
BEGIN
  IF p_tipo NOT IN ('entrada','saida') THEN RAISE EXCEPTION 'Tipo invalido'; END IF;
  IF p_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade invalida'; END IF;
  IF NOT (has_role(p_usuario_id,'admin'::app_role) OR has_role(p_usuario_id,'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  SELECT controla_tamanho INTO v_controla FROM public.produtos WHERE id = p_produto_id;
  IF v_controla IS NULL THEN RAISE EXCEPTION 'Produto nao encontrado'; END IF;

  IF v_controla THEN
    IF p_tamanho_id IS NULL THEN RAISE EXCEPTION 'Tamanho obrigatório para este brinde'; END IF;
    IF p_tipo = 'entrada' THEN
      UPDATE public.produto_tamanhos
        SET quantidade = quantidade + p_quantidade
        WHERE produto_id = p_produto_id AND tamanho_id = p_tamanho_id
        RETURNING quantidade INTO v_nova_quantidade;
      IF NOT FOUND THEN
        INSERT INTO public.produto_tamanhos (produto_id, tamanho_id, quantidade)
        VALUES (p_produto_id, p_tamanho_id, p_quantidade)
        RETURNING quantidade INTO v_nova_quantidade;
      END IF;
    ELSE
      UPDATE public.produto_tamanhos
        SET quantidade = quantidade - p_quantidade
        WHERE produto_id = p_produto_id AND tamanho_id = p_tamanho_id
          AND quantidade >= p_quantidade
        RETURNING quantidade INTO v_nova_quantidade;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
    END IF;
  ELSE
    IF p_tipo = 'entrada' THEN
      UPDATE public.produtos SET quantidade = quantidade + p_quantidade
        WHERE id = p_produto_id RETURNING quantidade INTO v_nova_quantidade;
    ELSE
      UPDATE public.produtos SET quantidade = quantidade - p_quantidade
        WHERE id = p_produto_id AND quantidade >= p_quantidade
        RETURNING quantidade INTO v_nova_quantidade;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
    END IF;
  END IF;

  INSERT INTO public.movimentacoes (produto_id, tipo, quantidade, observacao, setor, usuario_id, tamanho_id)
  VALUES (p_produto_id, p_tipo, p_quantidade, p_observacao, p_setor, p_usuario_id,
          CASE WHEN v_controla THEN p_tamanho_id ELSE NULL END);

  RETURN jsonb_build_object('success', true, 'new_quantity', v_nova_quantidade);
END;
$$;

-- 7) Criação de pedido com itens (multi-tamanho)
CREATE OR REPLACE FUNCTION public.create_pedido_com_itens(
  p_solicitante_id uuid,
  p_produto_id uuid,
  p_motivo text,
  p_prioridade text,
  p_itens jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_pedido_id uuid;
  v_total integer := 0;
  v_item jsonb;
BEGIN
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_total := v_total + COALESCE((v_item->>'quantidade')::int, 0);
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'Quantidade total invalida'; END IF;

  INSERT INTO public.pedidos (produto_id, quantidade, solicitante_id, motivo, prioridade, status)
  VALUES (p_produto_id, v_total, p_solicitante_id, p_motivo, COALESCE(p_prioridade,'normal'), 'pendente')
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    INSERT INTO public.pedido_itens (pedido_id, produto_id, tamanho_id, quantidade)
    VALUES (
      v_pedido_id, p_produto_id,
      NULLIF(v_item->>'tamanho_id','')::uuid,
      (v_item->>'quantidade')::int
    );
  END LOOP;

  RETURN v_pedido_id;
END;
$$;

-- 8) Aprovação: se houver pedido_itens, itera; senão fallback ao comportamento antigo
CREATE OR REPLACE FUNCTION public.approve_pedido_atomic(
  p_pedido_id uuid, p_status text, p_aprovador_id uuid, p_motivo_rejeicao text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_pedido RECORD;
  v_item RECORD;
  v_has_items boolean;
BEGIN
  IF NOT (has_role(p_aprovador_id,'admin'::app_role) OR has_role(p_aprovador_id,'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;
  IF p_status NOT IN ('aprovada','rejeitada') THEN RAISE EXCEPTION 'Status invalido'; END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado'; END IF;
  IF v_pedido.status <> 'pendente' THEN RAISE EXCEPTION 'Pedido ja processado'; END IF;

  IF p_status = 'aprovada' THEN
    SELECT EXISTS(SELECT 1 FROM public.pedido_itens WHERE pedido_id = p_pedido_id) INTO v_has_items;
    IF v_has_items THEN
      FOR v_item IN SELECT * FROM public.pedido_itens WHERE pedido_id = p_pedido_id LOOP
        IF v_item.tamanho_id IS NOT NULL THEN
          UPDATE public.produto_tamanhos
            SET quantidade = quantidade - v_item.quantidade
            WHERE produto_id = v_item.produto_id AND tamanho_id = v_item.tamanho_id
              AND quantidade >= v_item.quantidade;
          IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente no tamanho'; END IF;
        ELSE
          UPDATE public.produtos SET quantidade = quantidade - v_item.quantidade
            WHERE id = v_item.produto_id AND quantidade >= v_item.quantidade;
          IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
        END IF;
        INSERT INTO public.movimentacoes (produto_id, tipo, quantidade, observacao, usuario_id, tamanho_id)
        VALUES (v_item.produto_id, 'saida', v_item.quantidade,
                'Pedido #' || substr(p_pedido_id::text,1,8) || ' aprovado', p_aprovador_id, v_item.tamanho_id);
      END LOOP;
    ELSE
      UPDATE public.produtos SET quantidade = quantidade - v_pedido.quantidade
        WHERE id = v_pedido.produto_id AND quantidade >= v_pedido.quantidade;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
      INSERT INTO public.movimentacoes (produto_id, tipo, quantidade, observacao, usuario_id)
      VALUES (v_pedido.produto_id, 'saida', v_pedido.quantidade,
              'Pedido #' || substr(p_pedido_id::text,1,8) || ' aprovado', p_aprovador_id);
    END IF;

    UPDATE public.pedidos SET status='aprovada', data_aprovacao=now(), aprovador_id=p_aprovador_id
      WHERE id = p_pedido_id;
  ELSE
    UPDATE public.pedidos
       SET status='rejeitada', data_aprovacao=now(), aprovador_id=p_aprovador_id,
           motivo = CASE WHEN p_motivo_rejeicao IS NOT NULL
                         THEN '[Rejeitado] ' || p_motivo_rejeicao ELSE motivo END
     WHERE id = p_pedido_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
