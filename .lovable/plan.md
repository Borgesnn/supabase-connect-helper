
# Módulo Materiais Visuais

Novo módulo espelhando o padrão do módulo de Brindes (visual, permissões por setor, RLS, exportação, badges de status). Adiciona-se um item expansível no menu lateral com 4 submenus.

## Menu lateral (Sidebar.tsx)
Grupo dropdown "Materiais Visuais" (ícone Palette) com:
- Catálogo de Materiais → `/materiais-visuais/catalogo`
- Solicitações de Artes → `/materiais-visuais/artes`
- Empréstimos → `/materiais-visuais/emprestimos`
- Histórico → `/materiais-visuais/historico`

Mesma lógica de expansão automática quando a rota estiver ativa (igual ao grupo de Brindes).

## Páginas
- `src/pages/materiais/CatalogoMateriais.tsx` — grid de cards com foto, badge de status, filtro por marca/categoria/setor. CRUD (admin), visualização por setor (usuário). Estrutura reaproveita `Brindes.tsx` (autocomplete de fornecedor, upload de imagem via bucket assinado, seletor de áreas).
- `src/pages/materiais/SolicitacoesArtes.tsx` — lista de solicitações + botão "Nova solicitação" que abre dialog com briefing estruturado (conteúdo, formato, identidade visual, referências, prazo). Filtros por status/prioridade.
- `src/pages/materiais/EmprestimosMateriais.tsx` — registrar empréstimo/devolução; ao aprovar altera o status do material. Reaproveita padrão do fluxo de Pedidos.
- `src/pages/materiais/HistoricoMateriais.tsx` — timeline por material + exportação Excel (usando `xlsx` já presente na página de Movimentações), filtros por período, marca, setor, categoria, status, responsável.

Todas herdam MainLayout e os componentes shadcn/tokens já usados.

## Banco de dados (migração única)

Tabelas novas (todas em `public`, com GRANT + RLS + policies via `has_role`/`user_can_see_produto`-equivalente):

- `materiais_categorias` (nome, ordem, ativo) — seed: Wind Banner, Bandeira, Roll Up, Banner, Inflável, Guarda-sol, Guarda-chuva, Totem, Backdrop, Roleta Promocional, Tenda, Faixa, Adesivos, Cavalete, Outros.
- `materiais_formatos` (nome, dimensoes, ativo) — seed: Feed 1080x1080, Story 1080x1920, Banner Site, WhatsApp, E-mail Marketing, Folder, Cartaz, Outdoor, Outro.
- `materiais_visuais` (nome, categoria_id, marca_id, codigo, quantidade, local_armazenamento, foto_path, estado_conservacao, observacoes, status enum, created_at, updated_at).
  Status enum: `em_estoque | emprestado | reservado | manutencao | baixado`.
- `material_areas` (material_id, area_id) — mesmo modelo de `produto_areas`.
- `material_emprestimos` (material_id, quantidade, responsavel_id, setor, data_retirada, data_prevista_devolucao, data_devolucao, condicao_devolucao, observacoes, status).
- `arte_solicitacoes` (numero serial, solicitante_id, setor, titulo, subtitulo, texto_principal, cta, rodape, objetivo, publico_alvo, marca_id, cores, elementos, estilo, data_desejada, prioridade enum, status enum, created_at).
- `arte_solicitacao_formatos` (solicitacao_id, formato_id).
- `arte_solicitacao_anexos` (solicitacao_id, tipo `imagem|pdf|arquivo|link`, path_or_url, nome).

Prioridade enum: `baixa | media | alta | urgente`. Status arte: `aguardando | em_andamento | em_aprovacao | concluido | cancelado`.

Função `register_emprestimo_atomic` (SECURITY DEFINER) — decrementa/atualiza status do material e cria registro, mesmo padrão de `register_movement_atomic`.

## Storage
- Bucket privado `materiais-visuais` (fotos dos itens).
- Bucket privado `artes-referencias` (anexos das solicitações).
Componente `SignedImage` existente é reaproveitado.

## Permissões (RLS)
- SELECT em `materiais_visuais`: admin + diretoria + itens sem área + área "Geral" + áreas do usuário (mesma lógica de `user_can_see_produto`, criando função `user_can_see_material`).
- INSERT/UPDATE/DELETE materiais e categorias: apenas `admin`.
- Empréstimos: admin/operário criam e finalizam; usuário comum lê seus próprios.
- Solicitações de arte: qualquer usuário autenticado cria; admin altera status; solicitante lê as próprias; admin lê todas.

## Rotas
Adicionar em `src/App.tsx` dentro de `ProtectedRoute`:
```
/materiais-visuais/catalogo
/materiais-visuais/artes
/materiais-visuais/emprestimos
/materiais-visuais/historico
```

## Exportação
Utilitário compartilhado (já usado em Movimentações) para gerar `.xlsx` com filtros de histórico e catálogo.

## Fora de escopo
- Aprovação em múltiplos níveis para artes (apenas mudança de status).
- Modelos de briefing pré-preenchidos (podem ser adicionados depois via nova tabela `arte_modelos`).
- Notificações por e-mail.
