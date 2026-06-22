
-- Drop public SELECT policies on business/product buckets
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view fornecedores files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view cotacoes files" ON storage.objects;

CREATE POLICY "Authenticated can view product images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'produtos');

CREATE POLICY "Authenticated can view fornecedores files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fornecedores');

CREATE POLICY "Authenticated can view cotacoes files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cotacoes');

-- Atomic pedido approval with row-level locking
CREATE OR REPLACE FUNCTION public.approve_pedido_atomic(
  p_pedido_id uuid,
  p_status text,
  p_aprovador_id uuid,
  p_motivo_rejeicao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido RECORD;
  v_nova_quantidade integer;
BEGIN
  IF NOT (has_role(p_aprovador_id, 'admin'::app_role) OR has_role(p_aprovador_id, 'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  IF p_status NOT IN ('aprovada','rejeitada') THEN
    RAISE EXCEPTION 'Status invalido';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  IF v_pedido.status <> 'pendente' THEN
    RAISE EXCEPTION 'Pedido ja processado';
  END IF;

  IF p_status = 'aprovada' THEN
    UPDATE public.produtos
       SET quantidade = quantidade - v_pedido.quantidade
     WHERE id = v_pedido.produto_id
       AND quantidade >= v_pedido.quantidade
    RETURNING quantidade INTO v_nova_quantidade;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Estoque insuficiente';
    END IF;

    INSERT INTO public.movimentacoes (produto_id, tipo, quantidade, observacao, usuario_id)
    VALUES (v_pedido.produto_id, 'saida', v_pedido.quantidade,
            'Pedido #' || substr(p_pedido_id::text,1,8) || ' aprovado', p_aprovador_id);

    UPDATE public.pedidos
       SET status = 'aprovada',
           data_aprovacao = now(),
           aprovador_id = p_aprovador_id
     WHERE id = p_pedido_id;
  ELSE
    UPDATE public.pedidos
       SET status = 'rejeitada',
           data_aprovacao = now(),
           aprovador_id = p_aprovador_id,
           motivo = CASE WHEN p_motivo_rejeicao IS NOT NULL
                         THEN '[Rejeitado] ' || p_motivo_rejeicao
                         ELSE motivo END
     WHERE id = p_pedido_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_quantity', v_nova_quantidade);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pedido_atomic(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pedido_atomic(uuid, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_movement_atomic(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_observacao text,
  p_setor text,
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova_quantidade integer;
BEGIN
  IF p_tipo NOT IN ('entrada','saida') THEN
    RAISE EXCEPTION 'Tipo invalido';
  END IF;
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade invalida';
  END IF;
  IF NOT (has_role(p_usuario_id, 'admin'::app_role) OR has_role(p_usuario_id, 'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  IF p_tipo = 'entrada' THEN
    UPDATE public.produtos
       SET quantidade = quantidade + p_quantidade
     WHERE id = p_produto_id
    RETURNING quantidade INTO v_nova_quantidade;
  ELSE
    UPDATE public.produtos
       SET quantidade = quantidade - p_quantidade
     WHERE id = p_produto_id
       AND quantidade >= p_quantidade
    RETURNING quantidade INTO v_nova_quantidade;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Estoque insuficiente';
    END IF;
  END IF;

  IF v_nova_quantidade IS NULL THEN
    RAISE EXCEPTION 'Produto nao encontrado';
  END IF;

  INSERT INTO public.movimentacoes (produto_id, tipo, quantidade, observacao, setor, usuario_id)
  VALUES (p_produto_id, p_tipo, p_quantidade, p_observacao, p_setor, p_usuario_id);

  RETURN jsonb_build_object('success', true, 'new_quantity', v_nova_quantidade);
END;
$$;

REVOKE ALL ON FUNCTION public.register_movement_atomic(uuid, text, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_movement_atomic(uuid, text, integer, text, text, uuid) TO authenticated;
