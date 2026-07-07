import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Tamanho {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export function useTamanhos() {
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('tamanhos')
        .select('id, nome, ordem, ativo')
        .eq('ativo', true)
        .order('ordem');
      if (mounted) {
        setTamanhos((data || []) as Tamanho[]);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { tamanhos, loading };
}

export interface ProdutoTamanhoRow {
  id?: string;
  produto_id?: string;
  tamanho_id: string;
  quantidade: number;
  estoque_minimo: number;
}

export async function fetchProdutoTamanhos(produtoId: string): Promise<ProdutoTamanhoRow[]> {
  const { data, error } = await supabase
    .from('produto_tamanhos')
    .select('id, produto_id, tamanho_id, quantidade, estoque_minimo')
    .eq('produto_id', produtoId);
  if (error) throw error;
  return (data || []) as ProdutoTamanhoRow[];
}
