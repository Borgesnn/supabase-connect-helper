
CREATE TYPE public.material_status AS ENUM ('em_estoque','emprestado','reservado','manutencao','baixado');
CREATE TYPE public.emprestimo_status AS ENUM ('ativo','devolvido','cancelado');
CREATE TYPE public.arte_prioridade AS ENUM ('baixa','media','alta','urgente');
CREATE TYPE public.arte_status AS ENUM ('aguardando','em_andamento','em_aprovacao','concluido','cancelado');

CREATE TABLE public.materiais_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materiais_categorias TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.materiais_categorias TO authenticated;
GRANT ALL ON public.materiais_categorias TO service_role;
ALTER TABLE public.materiais_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read" ON public.materiais_categorias FOR SELECT USING (true);
CREATE POLICY "cat_admin" ON public.materiais_categorias FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.materiais_categorias (nome, ordem) VALUES
 ('Wind Banner',1),('Bandeira',2),('Roll Up',3),('Banner',4),('Inflável',5),
 ('Guarda-sol',6),('Guarda-chuva',7),('Totem',8),('Backdrop',9),('Roleta Promocional',10),
 ('Tenda',11),('Faixa',12),('Adesivos',13),('Cavalete',14),('Outros',99);

CREATE TABLE public.materiais_formatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  dimensoes text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materiais_formatos TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.materiais_formatos TO authenticated;
GRANT ALL ON public.materiais_formatos TO service_role;
ALTER TABLE public.materiais_formatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fmt_read" ON public.materiais_formatos FOR SELECT USING (true);
CREATE POLICY "fmt_admin" ON public.materiais_formatos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.materiais_formatos (nome, dimensoes, ordem) VALUES
 ('Feed Instagram','1080x1080',1),('Story','1080x1920',2),('Banner Site',NULL,3),
 ('WhatsApp',NULL,4),('E-mail Marketing',NULL,5),('Folder',NULL,6),
 ('Cartaz',NULL,7),('Outdoor',NULL,8),('Outro',NULL,99);

CREATE TABLE public.materiais_visuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria_id uuid REFERENCES public.materiais_categorias(id),
  marca_id uuid REFERENCES public.marcas(id),
  codigo text,
  quantidade int NOT NULL DEFAULT 0,
  local_armazenamento text,
  foto_path text,
  estado_conservacao text,
  observacoes text,
  status public.material_status NOT NULL DEFAULT 'em_estoque',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_visuais TO authenticated;
GRANT ALL ON public.materiais_visuais TO service_role;
ALTER TABLE public.materiais_visuais ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.material_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materiais_visuais(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(material_id, area_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_areas TO authenticated;
GRANT ALL ON public.material_areas TO service_role;
ALTER TABLE public.material_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_read" ON public.material_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "ma_admin" ON public.material_areas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.user_can_see_material(_user_id uuid, _material_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    has_role(_user_id,'admin'::app_role)
    OR public.is_diretoria(_user_id)
    OR NOT EXISTS (SELECT 1 FROM public.material_areas WHERE material_id = _material_id)
    OR EXISTS (SELECT 1 FROM public.material_areas ma
               JOIN public.areas a ON a.id = ma.area_id
               WHERE ma.material_id = _material_id AND a.nome='Geral' AND a.parent_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.material_areas ma
               JOIN public.areas a ON a.id = ma.area_id
               LEFT JOIN public.areas p ON p.id = a.parent_id
               WHERE ma.material_id = _material_id
                 AND (a.id IN (SELECT area_id FROM public.user_areas WHERE user_id=_user_id)
                   OR p.id IN (SELECT area_id FROM public.user_areas WHERE user_id=_user_id)))
$$;

CREATE POLICY "mv_read" ON public.materiais_visuais FOR SELECT TO authenticated
  USING (public.user_can_see_material(auth.uid(), id));
CREATE POLICY "mv_admin" ON public.materiais_visuais FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.material_emprestimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial UNIQUE,
  material_id uuid NOT NULL REFERENCES public.materiais_visuais(id) ON DELETE CASCADE,
  quantidade int NOT NULL DEFAULT 1,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_nome text,
  setor text,
  data_retirada timestamptz NOT NULL DEFAULT now(),
  data_prevista_devolucao date,
  data_devolucao timestamptz,
  condicao_devolucao text,
  observacoes text,
  status public.emprestimo_status NOT NULL DEFAULT 'ativo',
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.material_emprestimos TO authenticated;
GRANT ALL ON public.material_emprestimos TO service_role;
ALTER TABLE public.material_emprestimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_read" ON public.material_emprestimos FOR SELECT TO authenticated
  USING (public.user_can_see_material(auth.uid(), material_id));
CREATE POLICY "emp_write" ON public.material_emprestimos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));

CREATE TABLE public.arte_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial UNIQUE,
  solicitante_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  setor text,
  titulo text NOT NULL,
  subtitulo text,
  texto_principal text,
  cta text,
  rodape text,
  objetivo text,
  publico_alvo text,
  marca_id uuid REFERENCES public.marcas(id),
  cores text,
  elementos text,
  estilo text,
  data_desejada date,
  prioridade public.arte_prioridade NOT NULL DEFAULT 'media',
  status public.arte_status NOT NULL DEFAULT 'aguardando',
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.arte_solicitacoes TO authenticated;
GRANT ALL ON public.arte_solicitacoes TO service_role;
ALTER TABLE public.arte_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arte_read" ON public.arte_solicitacoes FOR SELECT TO authenticated
  USING (solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role));
CREATE POLICY "arte_insert" ON public.arte_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid());
CREATE POLICY "arte_update" ON public.arte_solicitacoes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)
         OR (solicitante_id = auth.uid() AND status = 'aguardando'))
  WITH CHECK (true);

CREATE TABLE public.arte_solicitacao_formatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.arte_solicitacoes(id) ON DELETE CASCADE,
  formato_id uuid NOT NULL REFERENCES public.materiais_formatos(id),
  UNIQUE(solicitacao_id, formato_id)
);
GRANT SELECT, INSERT, DELETE ON public.arte_solicitacao_formatos TO authenticated;
GRANT ALL ON public.arte_solicitacao_formatos TO service_role;
ALTER TABLE public.arte_solicitacao_formatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asf_read" ON public.arte_solicitacao_formatos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))));
CREATE POLICY "asf_write" ON public.arte_solicitacao_formatos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))));

CREATE TABLE public.arte_solicitacao_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.arte_solicitacoes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('imagem','pdf','arquivo','link')),
  nome text,
  path_or_url text NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.arte_solicitacao_anexos TO authenticated;
GRANT ALL ON public.arte_solicitacao_anexos TO service_role;
ALTER TABLE public.arte_solicitacao_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asa_read" ON public.arte_solicitacao_anexos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role))));
CREATE POLICY "asa_write" ON public.arte_solicitacao_anexos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.arte_solicitacoes s WHERE s.id = solicitacao_id
    AND (s.solicitante_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))));

CREATE TRIGGER trg_mv_updated BEFORE UPDATE ON public.materiais_visuais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON public.material_emprestimos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_arte_updated BEFORE UPDATE ON public.arte_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.registrar_emprestimo_material(
  p_material_id uuid, p_quantidade int, p_responsavel_id uuid, p_responsavel_nome text,
  p_setor text, p_data_prevista date, p_observacoes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_qtd int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissão negada'; END IF;
  IF p_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT quantidade INTO v_qtd FROM public.materiais_visuais WHERE id = p_material_id FOR UPDATE;
  IF v_qtd IS NULL THEN RAISE EXCEPTION 'Material não encontrado'; END IF;
  IF v_qtd < p_quantidade THEN RAISE EXCEPTION 'Quantidade indisponível'; END IF;
  INSERT INTO public.material_emprestimos
    (material_id, quantidade, responsavel_id, responsavel_nome, setor, data_prevista_devolucao, observacoes, criado_por)
    VALUES (p_material_id, p_quantidade, p_responsavel_id, p_responsavel_nome, p_setor, p_data_prevista, p_observacoes, auth.uid())
    RETURNING id INTO v_id;
  UPDATE public.materiais_visuais SET quantidade = quantidade - p_quantidade,
    status = CASE WHEN quantidade - p_quantidade <= 0 THEN 'emprestado'::material_status ELSE status END
    WHERE id = p_material_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.devolver_emprestimo_material(
  p_emprestimo_id uuid, p_condicao text, p_observacoes text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_emp RECORD;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operario'::app_role)) THEN
    RAISE EXCEPTION 'Permissão negada'; END IF;
  SELECT * INTO v_emp FROM public.material_emprestimos WHERE id = p_emprestimo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado'; END IF;
  IF v_emp.status <> 'ativo' THEN RAISE EXCEPTION 'Empréstimo já finalizado'; END IF;
  UPDATE public.material_emprestimos SET status='devolvido', data_devolucao=now(),
    condicao_devolucao=p_condicao,
    observacoes=COALESCE(observacoes,'') || CASE WHEN p_observacoes IS NOT NULL THEN E'\n[Devolução] '||p_observacoes ELSE '' END
    WHERE id = p_emprestimo_id;
  UPDATE public.materiais_visuais SET quantidade = quantidade + v_emp.quantidade,
    status = CASE WHEN status='emprestado' THEN 'em_estoque'::material_status ELSE status END
    WHERE id = v_emp.material_id;
END $$;
