DROP FUNCTION IF EXISTS public.register_movement_atomic(uuid, text, integer, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.register_movement_atomic(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_observacao text,
  p_setor text,
  p_usuario_id uuid,
  p_tamanho_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantidade_atual integer;
  v_quantidade_tamanho integer;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero';
  END IF;

  -- Lock product row to prevent race conditions
  SELECT quantidade INTO v_quantidade_atual
  FROM produtos
  WHERE id = p_produto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  IF p_tipo = 'saida' THEN
    IF p_tamanho_id IS NOT NULL THEN
      SELECT quantidade INTO v_quantidade_tamanho
      FROM produto_tamanhos
      WHERE produto_id = p_produto_id AND tamanho_id = p_tamanho_id
      FOR UPDATE;
      v_quantidade_tamanho := COALESCE(v_quantidade_tamanho, 0);
      IF p_quantidade > v_quantidade_tamanho THEN
        RAISE EXCEPTION 'Quantidade insuficiente: estoque no tamanho é %', v_quantidade_tamanho;
      END IF;
    ELSE
      IF p_quantidade > v_quantidade_atual THEN
        RAISE EXCEPTION 'Quantidade insuficiente: estoque disponível é %', v_quantidade_atual;
      END IF;
    END IF;
  END IF;

  -- Apply movement
  IF p_tamanho_id IS NOT NULL THEN
    UPDATE produto_tamanhos
    SET quantidade = quantidade + CASE WHEN p_tipo = 'entrada' THEN p_quantidade ELSE -p_quantidade END,
        updated_at = now()
    WHERE produto_id = p_produto_id AND tamanho_id = p_tamanho_id;
  ELSE
    UPDATE produtos
    SET quantidade = quantidade + CASE WHEN p_tipo = 'entrada' THEN p_quantidade ELSE -p_quantidade END,
        updated_at = now()
    WHERE id = p_produto_id;
  END IF;

  INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, setor, usuario_id, tamanho_id)
  VALUES (p_produto_id, p_tipo, p_quantidade, p_observacao, p_setor, p_usuario_id, p_tamanho_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_movement_atomic(uuid, text, integer, text, text, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_movement_atomic(uuid, text, integer, text, text, uuid, uuid) TO authenticated;