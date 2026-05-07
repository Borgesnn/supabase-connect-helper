
-- Clear existing links
DELETE FROM produto_areas;
DELETE FROM user_areas;
DELETE FROM areas;

-- Insert new simplified structure
-- Caminhões (level 0)
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Caminhões', NULL, 0, false, 1);
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000001-0000-0000-0000-000000000011', 'Vendas', 'a0000001-0000-0000-0000-000000000001', 1, false, 1),
  ('a0000001-0000-0000-0000-000000000012', 'Pós-venda', 'a0000001-0000-0000-0000-000000000001', 1, false, 2);

-- Máquinas (level 0)
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000002-0000-0000-0000-000000000001', 'Máquinas', NULL, 0, false, 2);
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000002-0000-0000-0000-000000000011', 'Vendas', 'a0000002-0000-0000-0000-000000000001', 1, false, 1),
  ('a0000002-0000-0000-0000-000000000012', 'Pós-venda', 'a0000002-0000-0000-0000-000000000001', 1, false, 2);

-- Diretoria (level 0, is_diretoria=true)
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000003-0000-0000-0000-000000000001', 'Diretoria', NULL, 0, true, 3);

-- Geral (level 0, default sector)
INSERT INTO areas (id, nome, parent_id, nivel, is_diretoria, ordem) VALUES
  ('a0000004-0000-0000-0000-000000000001', 'Geral', NULL, 0, false, 4);

-- Update user_can_see_produto to handle "Geral" sector visibility
CREATE OR REPLACE FUNCTION public.user_can_see_produto(_user_id uuid, _produto_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins see everything
    has_role(_user_id, 'admin'::app_role)
    -- Diretoria sees everything
    OR public.is_diretoria(_user_id)
    -- Products with no area linked are visible to all
    OR NOT EXISTS (SELECT 1 FROM public.produto_areas WHERE produto_id = _produto_id)
    -- Products linked to "Geral" are visible to all
    OR EXISTS (
      SELECT 1 FROM public.produto_areas pa
      JOIN public.areas a ON a.id = pa.area_id
      WHERE pa.produto_id = _produto_id AND a.nome = 'Geral' AND a.parent_id IS NULL
    )
    -- Otherwise check if user's area matches product's area (including parent hierarchy)
    OR EXISTS (
      SELECT 1
      FROM public.produto_areas pa
      JOIN public.areas a ON a.id = pa.area_id
      LEFT JOIN public.areas parent ON parent.id = a.parent_id
      WHERE pa.produto_id = _produto_id
        AND (
          a.id IN (SELECT area_id FROM public.user_areas WHERE user_id = _user_id)
          OR parent.id IN (SELECT area_id FROM public.user_areas WHERE user_id = _user_id)
        )
    )
$$;
