## Objetivo
Adicionar controle de estoque opcional por tamanho (PP…XGG) para brindes como camisetas, sem afetar brindes com quantidade única.

## Banco de Dados (migração única)

**Novas tabelas**
- `tamanhos` — catálogo global editável: `nome` (único), `ordem` (int), `ativo` (bool). Seed com PP, P, M, G, GG, XG, XGG.
- `produto_tamanhos` — estoque por tamanho: `produto_id`, `tamanho_id`, `quantidade`, `estoque_minimo`. Único por (produto, tamanho).
- `pedido_itens` — para permitir vários tamanhos no mesmo pedido: `pedido_id`, `produto_id`, `tamanho_id` (nullable), `quantidade`.

**Alterações**
- `produtos.controla_tamanho` (bool, default false).
- `movimentacoes.tamanho_id` (nullable) — preenchido quando o brinde controla por tamanho.

**Sincronização do total**
- Trigger em `produto_tamanhos` que recalcula `produtos.quantidade = SUM(produto_tamanhos.quantidade)` sempre que houver mudança. Assim o Dashboard, Catálogo e listagens continuam usando `produtos.quantidade` sem mudança.

**RPCs atualizadas**
- `register_movement_atomic`: novo parâmetro `p_tamanho_id`. Se o produto controla tamanho, exige `tamanho_id`, atualiza `produto_tamanhos.quantidade` (trigger recalcula total); senão, comportamento atual.
- `approve_pedido_atomic`: itera `pedido_itens`, valida estoque por tamanho, dá baixa em `produto_tamanhos` (ou em `produtos` para itens sem tamanho), gera uma movimentação por item.
- Nova RPC `create_pedido_com_itens(itens jsonb, motivo, prioridade)` para criar pedido + itens atomicamente.

**RLS/GRANTs** iguais ao padrão do projeto (authenticated CRUD; service_role ALL).

## Frontend

**Brindes.tsx (cadastro/edição)**
- Checkbox "Controlar estoque por tamanho".
- Quando ativo: some o campo "Quantidade" único; aparece grid de tamanhos (checkbox para ativar cada tamanho + input de quantidade + estoque mínimo).
- Total exibido = soma automática.
- Catálogo continua mostrando só `quantidade` total (badge).
- Detalhes/edição: mostra breakdown por tamanho.
- Solicitação (dialog "Solicitar"):
  - Se controla tamanho: lista de itens (tamanho + quantidade, iniciando em 0, limitada pelo estoque daquele tamanho). Botão "Adicionar tamanho" para mais linhas.
  - Se não: fluxo atual (quantidade única).
  - Motivo continua obrigatório ≥ 50 chars.

**Movimentacoes.tsx**
- Após escolher o produto, se controla tamanho, exibir Select "Tamanho" obrigatório (mostrando estoque disponível por tamanho). Quantidade opera sobre aquele tamanho.
- Histórico e export Excel: nova coluna "Tamanho".

**Pedidos.tsx (+ Novo Pedido)**
- Mesmo fluxo do dialog de Brindes: itens com tamanho + quantidade quando aplicável. Listagem de pedidos exibe tamanho quando existir.

**ImportarExportar.tsx**
- Exportação de brindes: coluna por tamanho quando `controla_tamanho`.
- Exportação de movimentações: incluir coluna Tamanho.

## Escalabilidade
- Novos tamanhos: inserir linha em `tamanhos` (via SQL ou tela futura de Configurações). Nada no código muda.
- Toda UI lê a lista de tamanhos ativos ordenada por `ordem`.

## Fora de escopo
- Tela de gerenciamento de tamanhos em Configurações (fica para depois; por ora edita-se via banco).
- Migrar histórico antigo de pedidos para `pedido_itens` — pedidos antigos continuam usando `pedidos.quantidade`; novos usam itens.
