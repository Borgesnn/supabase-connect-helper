ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS setor text;

CREATE OR REPLACE FUNCTION public.create_pedido_com_itens(p_solicitante_id uuid, p_produto_id uuid, p_motivo text, p_prioridade text, p_itens jsonb, p_setor text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.pedidos (produto_id, quantidade, solicitante_id, motivo, prioridade, status, setor)
  VALUES (p_produto_id, v_total, p_solicitante_id, p_motivo, COALESCE(p_prioridade,'normal'), 'pendente', p_setor)
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
$function$;

REVOKE EXECUTE ON FUNCTION public.create_pedido_com_itens(uuid, uuid, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pedido_com_itens(uuid, uuid, text, text, jsonb, text) TO authenticated, service_role;