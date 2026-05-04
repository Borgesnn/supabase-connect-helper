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
      movimentacoes: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          setor: string | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          setor?: string | null
          tipo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          setor?: string | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
          solicitante_id: string
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
          solicitante_id: string
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
          solicitante_id?: string
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
      produtos: {
        Row: {
          categoria_id: string | null
          codigo: string
          created_at: string
          descricao: string | null
          estoque_minimo: number
          fornecedor: string | null
          id: string
          imagem_url: string | null
          localizacao: string | null
          nome: string
          quantidade: number
          updated_at: string
          valor_compra: number | null
        }
        Insert: {
          categoria_id?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          nome: string
          quantidade?: number
          updated_at?: string
          valor_compra?: number | null
        }
        Update: {
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_diretoria: { Args: { _user_id: string }; Returns: boolean }
      user_can_see_produto: {
        Args: { _produto_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operario" | "usuario"
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
    },
  },
} as const
