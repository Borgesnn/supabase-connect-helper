
-- =====================================================
-- 1. Tabela de áreas (categorias/subcategorias hierárquicas)
-- =====================================================
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  parent_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL DEFAULT 0, -- 0=categoria, 1=subcategoria, 2=cargo
  is_diretoria BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view areas"
  ON public.areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage areas"
  ON public.areas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Popular áreas
DO $$
DECLARE
  v_caminhoes UUID; v_maquinas UUID; v_diretoria UUID;
  v_cam_vendas UUID; v_cam_pos UUID;
  v_maq_vendas UUID; v_maq_pos UUID;
BEGIN
  INSERT INTO public.areas (nome, nivel, ordem) VALUES ('Caminhões', 0, 1) RETURNING id INTO v_caminhoes;
  INSERT INTO public.areas (nome, nivel, ordem) VALUES ('Máquinas', 0, 2) RETURNING id INTO v_maquinas;
  INSERT INTO public.areas (nome, nivel, is_diretoria, ordem) VALUES ('Diretoria', 0, true, 3) RETURNING id INTO v_diretoria;

  INSERT INTO public.areas (nome, parent_id, nivel, ordem) VALUES ('Vendas', v_caminhoes, 1, 1) RETURNING id INTO v_cam_vendas;
  INSERT INTO public.areas (nome, parent_id, nivel, ordem) VALUES ('Pós-venda', v_caminhoes, 1, 2) RETURNING id INTO v_cam_pos;
  INSERT INTO public.areas (nome, parent_id, nivel, ordem) VALUES ('Vendas VCE', v_maquinas, 1, 1) RETURNING id INTO v_maq_vendas;
  INSERT INTO public.areas (nome, parent_id, nivel, ordem) VALUES ('Pós-venda VCE', v_maquinas, 1, 2) RETURNING id INTO v_maq_pos;

  INSERT INTO public.areas (nome, parent_id, nivel, ordem) VALUES
    ('Consultoria', v_cam_vendas, 2, 1), ('Gerência', v_cam_vendas, 2, 2),
    ('Consultoria', v_cam_pos, 2, 1),    ('Gerência', v_cam_pos, 2, 2),
    ('Consultoria', v_maq_vendas, 2, 1), ('Gerência', v_maq_vendas, 2, 2),
    ('Consultoria', v_maq_pos, 2, 1),    ('Gerência', v_maq_pos, 2, 2);
END $$;

-- =====================================================
-- 2. Vínculo usuário ↔ área
-- =====================================================
CREATE TABLE public.user_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_id)
);

ALTER TABLE public.user_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own areas"
  ON public.user_areas FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

CREATE POLICY "Admins manage user areas"
  ON public.user_areas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Vínculo produto ↔ área (múltiplas)
-- =====================================================
CREATE TABLE public.produto_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produto_id, area_id)
);

ALTER TABLE public.produto_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view produto_areas"
  ON public.produto_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/operarios manage produto_areas"
  ON public.produto_areas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operario'::app_role));

-- =====================================================
-- 4. Prioridade em pedidos
-- =====================================================
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS prioridade TEXT NOT NULL DEFAULT 'normal';

-- =====================================================
-- 5. Funções de acesso
-- =====================================================

-- Verifica se o usuário pertence à Diretoria
CREATE OR REPLACE FUNCTION public.is_diretoria(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_areas ua
    JOIN public.areas a ON a.id = ua.area_id
    WHERE ua.user_id = _user_id AND a.is_diretoria = true
  )
$$;

-- Retorna IDs de produtos visíveis ao usuário
-- Regra: admin OU diretoria => tudo. Caso contrário => produtos sem vínculo de área OU vinculados a uma área do usuário (ou suas filhas).
CREATE OR REPLACE FUNCTION public.user_can_see_produto(_user_id UUID, _produto_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR public.is_diretoria(_user_id)
    OR NOT EXISTS (SELECT 1 FROM public.produto_areas WHERE produto_id = _produto_id)
    OR EXISTS (
      SELECT 1
      FROM public.produto_areas pa
      JOIN public.areas a ON a.id = pa.area_id
      LEFT JOIN public.areas parent ON parent.id = a.parent_id
      LEFT JOIN public.areas grand ON grand.id = parent.parent_id
      WHERE pa.produto_id = _produto_id
        AND (
          a.id IN (SELECT area_id FROM public.user_areas WHERE user_id = _user_id)
          OR parent.id IN (SELECT area_id FROM public.user_areas WHERE user_id = _user_id)
          OR grand.id IN (SELECT area_id FROM public.user_areas WHERE user_id = _user_id)
        )
    )
$$;

-- =====================================================
-- 6. Atualizar RLS de produtos
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.produtos;

CREATE POLICY "Users view products in their areas"
  ON public.produtos FOR SELECT TO authenticated
  USING (public.user_can_see_produto(auth.uid(), id));

-- =====================================================
-- 7. Atualizar RLS de pedidos (visualização por área)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own requests" ON public.pedidos;

CREATE POLICY "Users view requests by area"
  ON public.pedidos FOR SELECT TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.is_diretoria(auth.uid())
    OR (has_role(auth.uid(), 'operario'::app_role) AND public.user_can_see_produto(auth.uid(), produto_id))
  );

-- =====================================================
-- 8. Atualizar RLS de cotações
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view cotacoes" ON public.cotacoes;

CREATE POLICY "Users view cotacoes by area"
  ON public.cotacoes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operario'::app_role)
    OR public.is_diretoria(auth.uid())
    OR produto_id IS NULL
    OR public.user_can_see_produto(auth.uid(), produto_id)
  );
