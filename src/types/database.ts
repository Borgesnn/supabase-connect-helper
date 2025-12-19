export type AppRole = 'admin' | 'operario' | 'usuario';

export interface Profile {
  id: string;
  nome: string;
  cargo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  nome: string;
  created_at: string;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  categoria_id: string | null;
  quantidade: number;
  estoque_minimo: number;
  localizacao: string | null;
  imagem_url: string | null;
  fornecedor: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  categoria?: Categoria;
}

export interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  observacao: string | null;
  usuario_id: string;
  created_at: string;
  produto?: Produto;
  profile?: Profile;
}

export interface Pedido {
  id: string;
  produto_id: string;
  quantidade: number;
  solicitante_id: string;
  motivo: string | null;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  data_aprovacao: string | null;
  aprovador_id: string | null;
  created_at: string;
  produto?: Produto;
  solicitante?: Profile;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}
