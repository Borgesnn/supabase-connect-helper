export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          id: string
          is_diretoria: boolean
          nivel: number
          nome: string
          ordem: number
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_diretoria?: boolean
          nivel?: number
          nome: string
          ordem?: number
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_diretoria?: boolean
          nivel?: number
          nome?: string
          ordem?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      arte_solicitacao_anexos: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          observacoes: string | null
          path_or_url: string
          solicitacao_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          path_or_url: string
          solicitacao_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          observacoes?: string | null
          path_or_url?: string
          solicitacao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "arte_solicitacao_anexos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "arte_solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      arte_solicitacao_formatos: {
        Row: {
          formato_id: string
          id: string
          solicitacao_id: string
        }
        Insert: {
          formato_id: string
          id?: string
          solicitacao_id: string
        }
        Update: {
          formato_id?: string
          id?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arte_solicitacao_formatos_formato_id_fkey"
            columns: ["formato_id"]
            isOneToOne: false
            referencedRelation: "materiais_formatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arte_solicitacao_formatos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "arte_solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      arte_solicitacoes: {
        Row: {
          cores: string | null
          created_at: string
          cta: string | null
          data_desejada: string | null
          elementos: string | null
          estilo: string | null
          id: string
          marca_id: string | null
          marca_ids: string[]
          numero: number
          objetivo: string | null
          observacoes_internas: string | null
          prioridade: Database["public"]["Enums"]["arte_prioridade"]
          publico_alvo: string | null
          responsavel_id: string | null
          rodape: string | null
          setor: string | null
          solicitante_id: string | null
          status: Database["public"]["Enums"]["arte_status"]
          subtitulo: string | null
          texto_principal: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          cores?: string | null
          created_at?: string
          cta?: string | null
          data_desejada?: string | null
          elementos?: string | null
          estilo?: string | null
          id?: string
          marca_id?: string | null
          marca_ids?: string[]
          numero?: number
          objetivo?: string | null
          observacoes_internas?: string | null
          prioridade?: Database["public"]["Enums"]["arte_prioridade"]
          publico_alvo?: string | null
          responsavel_id?: string | null
          rodape?: string | null
          setor?: string | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["arte_status"]
          subtitulo?: string | null
          texto_principal?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          cores?: string | null
          created_at?: string
          cta?: string | null
          data_desejada?: string | null
          elementos?: string | null
          estilo?: string | null
          id?: string
          marca_id?: string | null
          marca_ids?: string[]
          numero?: number
          objetivo?: string | null
          observacoes_internas?: string | null
          prioridade?: Database["public"]["Enums"]["arte_prioridade"]
          publico_alvo?: string | null
          responsavel_id?: string | null
          rodape?: string | null
          setor?: string | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["arte_status"]
          subtitulo?: string | null
          texto_principal?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arte_solicitacoes_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      cotacao_anexos: {
        Row: {
          arquivo_url: string
          categoria: string | null
          cotacao_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo: string | null
          uploaded_by: string
        }
        Insert: {
          arquivo_url: string
          categoria?: string | null
          cotacao_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by: string
        }
        Update: {
          arquivo_url?: string
          categoria?: string | null
          cotacao_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_anexos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_historico: {
        Row: {
          cotacao_id: string
          created_at: string
          id: string
          observacao: string | null
          status_anterior: string | null
          status_novo: string
          usuario_id: string
        }
        Insert: {
          cotacao_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo: string
          usuario_id: string
        }
        Update: {
          cotacao_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_historico_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string
          created_by: string
          data_prevista: string | null
          data_solicitacao: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          observacoes: string | null
          prazo_dias: number | null
          produto_id: string | null
          quantidade: number | null
          responsavel: string | null
          status: string
          updated_at: string
          valor_estimado: number | null
          valor_final: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          data_prevista?: string | null
          data_solicitacao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          prazo_dias?: number | null
          produto_id?: string | null
          quantidade?: number | null
          responsavel?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
          valor_final?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          data_prevista?: string | null
          data_solicitacao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          prazo_dias?: number | null
          produto_id?: string | null
          quantidade?: number | null
          responsavel?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_anexos: {
        Row: {
          arquivo_url: string
          created_at: string
          fornecedor_id: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo: string | null
          uploaded_by: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          fornecedor_id: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          fornecedor_id?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_anexos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          avaliacao: number | null
          categoria: string | null
          created_at: string
          email: string | null
          endereco: string | null
          forma_pagamento: string | null
          id: string
          logo_url: string | null
          nome: string
          observacoes: string | null
          prazo_entrega_dias: number | null
          responsavel: string | null
          site: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avaliacao?: number | null
          categoria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          responsavel?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avaliacao?: number | null
          categoria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          responsavel?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      materiais_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      materiais_formatos: {
        Row: {
          ativo: boolean
          created_at: string
          dimensoes: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dimensoes?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dimensoes?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      materiais_visuais: {
        Row: {
          categoria_id: string | null
          codigo: string | null
          created_at: string
          estado_conservacao: string | null
          foto_path: string | null
          id: string
          local_armazenamento: string | null
          marca_id: string | null
          nome: string
          observacoes: string | null
          quantidade: number
          status: Database["public"]["Enums"]["material_status"]
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          estado_conservacao?: string | null
          foto_path?: string | null
          id?: string
          local_armazenamento?: string | null
          marca_id?: string | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["material_status"]
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          estado_conservacao?: string | null
          foto_path?: string | null
          id?: string
          local_armazenamento?: string | null
          marca_id?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["material_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_visuais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "materiais_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_visuais_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      material_areas: {
        Row: {
          area_id: string
          created_at: string
          id: string
          material_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          material_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_areas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_visuais"
            referencedColumns: ["id"]
          },
        ]
      }
      material_emprestimos: {
        Row: {
          condicao_devolucao: string | null
          created_at: string
          criado_por: string | null
          data_devolucao: string | null
          data_prevista_devolucao: string | null
          data_retirada: string
          id: string
          material_id: string
          numero: number
          observacoes: string | null
          quantidade: number
          responsavel_id: string | null
          responsavel_nome: string | null
          setor: string | null
          status: Database["public"]["Enums"]["emprestimo_status"]
          updated_at: string
        }
        Insert: {
          condicao_devolucao?: string | null
          created_at?: string
          criado_por?: string | null
          data_devolucao?: string | null
          data_prevista_devolucao?: string | null
          data_retirada?: string
          id?: string
          material_id: string
          numero?: number
          observacoes?: string | null
          quantidade?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["emprestimo_status"]
          updated_at?: string
        }
        Update: {
          condicao_devolucao?: string | null
          created_at?: string
          criado_por?: string | null
          data_devolucao?: string | null
          data_prevista_devolucao?: string | null
          data_retirada?: string
          id?: string
          material_id?: string
          numero?: number
          observacoes?: string | null
          quantidade?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["emprestimo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_emprestimos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_visuais"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          setor: string | null
          tamanho_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          setor?: string | null
          tamanho_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          setor?: string | null
          tamanho_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_tamanho_id_fkey"
            columns: ["tamanho_id"]
            isOneToOne: false
            referencedRelation: "tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          produto_id: string
          quantidade: number
          tamanho_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          produto_id: string
          quantidade: number
          tamanho_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          tamanho_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_tamanho_id_fkey"
            columns: ["tamanho_id"]
            isOneToOne: false
            referencedRelation: "tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aprovador_id: string | null
          created_at: string
          data_aprovacao: string | null
          id: string
          motivo: string | null
          prioridade: string
          produto_id: string
          quantidade: number
          solicitante_id: string | null
          status: string
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          motivo?: string | null
          prioridade?: string
          produto_id: string
          quantidade: number
          solicitante_id?: string | null
          status?: string
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          id?: string
          motivo?: string | null
          prioridade?: string
          produto_id?: string
          quantidade?: number
          solicitante_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_areas: {
        Row: {
          area_id: string
          created_at: string
          id: string
          produto_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          produto_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_areas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_tamanhos: {
        Row: {
          created_at: string
          estoque_minimo: number
          id: string
          produto_id: string
          quantidade: number
          tamanho_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque_minimo?: number
          id?: string
          produto_id: string
          quantidade?: number
          tamanho_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque_minimo?: number
          id?: string
          produto_id?: string
          quantidade?: number
          tamanho_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_tamanhos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_tamanhos_tamanho_id_fkey"
            columns: ["tamanho_id"]
            isOneToOne: false
            referencedRelation: "tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria_id: string | null
          codigo: string
          controla_tamanho: boolean
          created_at: string
          descricao: string | null
          estoque_minimo: number
          fornecedor: string | null
          id: string
          imagem_url: string | null
          localizacao: string | null
          marca_id: string | null
          nome: string
          quantidade: number
          updated_at: string
          valor_compra: number | null
        }
        Insert: {
          categoria_id?: string | null
          codigo: string
          controla_tamanho?: boolean
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          marca_id?: string | null
          nome: string
          quantidade?: number
          updated_at?: string
          valor_compra?: number | null
        }
        Update: {
          categoria_id?: string | null
          codigo?: string
          controla_tamanho?: boolean
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          marca_id?: string | null
          nome?: string
          quantidade?: number
          updated_at?: string
          valor_compra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          id: string
          nome: string
          sobrenome: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          id: string
          nome: string
          sobrenome?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string
          sobrenome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sugestoes: {
        Row: {
          created_at: string
          id: string
          imagem_url: string | null
          link: string | null
          nome: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imagem_url?: string | null
          link?: string | null
          nome: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imagem_url?: string | null
          link?: string | null
          nome?: string
          usuario_id?: string
        }
        Relationships: []
      }
      tamanhos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      user_areas: {
        Row: {
          area_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_pedido_atomic: {
        Args: {
          p_aprovador_id: string
          p_motivo_rejeicao?: string
          p_pedido_id: string
          p_status: string
        }
        Returns: Json
      }
      create_pedido_com_itens: {
        Args: {
          p_itens: Json
          p_motivo: string
          p_prioridade: string
          p_produto_id: string
          p_solicitante_id: string
        }
        Returns: string
      }
      devolver_emprestimo_material: {
        Args: {
          p_condicao: string
          p_emprestimo_id: string
          p_observacoes: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_diretoria: { Args: { _user_id: string }; Returns: boolean }
      register_movement_atomic:
        | {
            Args: {
              p_observacao: string
              p_produto_id: string
              p_quantidade: number
              p_setor: string
              p_tipo: string
              p_usuario_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_observacao: string
              p_produto_id: string
              p_quantidade: number
              p_setor: string
              p_tamanho_id?: string
              p_tipo: string
              p_usuario_id: string
            }
            Returns: Json
          }
      registrar_emprestimo_material: {
        Args: {
          p_data_prevista: string
          p_material_id: string
          p_observacoes: string
          p_quantidade: number
          p_responsavel_id: string
          p_responsavel_nome: string
          p_setor: string
        }
        Returns: string
      }
      user_can_see_material: {
        Args: { _material_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_produto: {
        Args: { _produto_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operario" | "usuario"
      arte_prioridade: "baixa" | "media" | "alta" | "urgente"
      arte_status:
        | "aguardando"
        | "em_andamento"
        | "em_aprovacao"
        | "concluido"
        | "cancelado"
      emprestimo_status: "ativo" | "devolvido" | "cancelado"
      material_status:
        | "em_estoque"
        | "emprestado"
        | "reservado"
        | "manutencao"
        | "baixado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operario", "usuario"],
      arte_prioridade: ["baixa", "media", "alta", "urgente"],
      arte_status: [
        "aguardando",
        "em_andamento",
        "em_aprovacao",
        "concluido",
        "cancelado",
      ],
      emprestimo_status: ["ativo", "devolvido", "cancelado"],
      material_status: [
        "em_estoque",
        "emprestado",
        "reservado",
        "manutencao",
        "baixado",
      ],
    },
  },
} as const
