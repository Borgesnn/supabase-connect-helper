
# Plano: Transformar Sistema de Produtos em Sistema de Brindes

## Objetivo
Alterar o sistema de controle de estoque de "Produtos" para "Brindes", atualizando toda a terminologia e inserindo os brindes de exemplo solicitados.

---

## Alteracoes Visuais

### 1. Renomear "Produtos" para "Brindes" em toda a aplicacao

**Arquivos a modificar:**

- **Sidebar.tsx**: Alterar o menu de navegacao
  - "Produtos" vira "Brindes"
  
- **Produtos.tsx** (sera renomeado para Brindes.tsx):
  - Titulo da pagina: "Brindes" 
  - Subtitulo: "Gerencie seu estoque de brindes"
  - Botao: "Novo Brinde"
  - Dialog: "Novo Brinde" / "Editar Brinde"
  - Mensagens de toast atualizadas

- **Dashboard.tsx**:
  - "Total de Produtos" vira "Total de Brindes"
  - "Estoque por Categoria" permanece igual

- **App.tsx**: Atualizar rota de `/produtos` para `/brindes`

---

## Alteracoes no Banco de Dados

### 2. Atualizar Categorias

Substituir as categorias atuais (Acessorios, Ferramentas, Fluidos, Pecas) por categorias de brindes:

| Categoria Atual | Nova Categoria |
|-----------------|----------------|
| Acessorios | Vestuario |
| Ferramentas | Escritorio |
| Fluidos | Miniaturas |
| Pecas | Brindes Especiais |

### 3. Inserir os Brindes de Exemplo

| Codigo | Nome | Categoria | Quantidade | Estoque Min. |
|--------|------|-----------|------------|--------------|
| BRD001 | Bone Preto GOT | Vestuario | 50 | 10 |
| BRD002 | Caneta GOT | Escritorio | 200 | 30 |
| BRD003 | Caminhao Volvo FH | Miniaturas | 25 | 5 |
| BRD004 | Camisa UV | Vestuario | 75 | 15 |
| BRD005 | Taca de Vinho | Brindes Especiais | 20 | 5 |

A **Taca de Vinho** sera marcada como "Brinde Especial" conforme solicitado.

---

## Resumo das Mudancas

```text
+------------------+     +------------------+
|   ANTES          |     |   DEPOIS         |
+------------------+     +------------------+
| Menu: Produtos   | --> | Menu: Brindes    |
| Rota: /produtos  | --> | Rota: /brindes   |
| Pagina: Produtos | --> | Pagina: Brindes  |
| Categorias:      |     | Categorias:      |
|  - Acessorios    | --> |  - Vestuario     |
|  - Ferramentas   | --> |  - Escritorio    |
|  - Fluidos       | --> |  - Miniaturas    |
|  - Pecas         | --> |  - Brindes Esp.  |
+------------------+     +------------------+
```

---

## Detalhes Tecnicos

1. **Renomear arquivo**: `src/pages/Produtos.tsx` para `src/pages/Brindes.tsx`
2. **Atualizar imports** no `App.tsx` para usar o novo componente
3. **SQL para atualizar categorias** (via migration tool):
   ```sql
   UPDATE categorias SET nome = 'Vestuario' WHERE nome = 'Acessorios';
   UPDATE categorias SET nome = 'Escritorio' WHERE nome = 'Ferramentas';
   UPDATE categorias SET nome = 'Miniaturas' WHERE nome = 'Fluidos';
   UPDATE categorias SET nome = 'Brindes Especiais' WHERE nome = 'Pecas';
   ```
4. **SQL para inserir brindes** (via insert tool):
   - Inserir 5 registros na tabela `produtos` com os dados especificados
