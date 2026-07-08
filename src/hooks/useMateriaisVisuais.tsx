import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialCategoria { id: string; nome: string; ordem: number; ativo: boolean; }
export interface MaterialFormato { id: string; nome: string; dimensoes: string | null; ativo: boolean; ordem: number; }
export interface Marca { id: string; nome: string; }

export function useMaterialCategorias() {
  const [data, setData] = useState<MaterialCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('materiais_categorias').select('*').eq('ativo', true).order('ordem');
      setData((data as any) || []);
      setLoading(false);
    })();
  }, []);
  return { data, loading };
}

export function useMaterialFormatos() {
  const [data, setData] = useState<MaterialFormato[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('materiais_formatos').select('*').eq('ativo', true).order('ordem');
      setData((data as any) || []);
    })();
  }, []);
  return data;
}

export function useMarcas() {
  const [data, setData] = useState<Marca[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('marcas').select('id, nome').order('nome');
      setData((data as any) || []);
    })();
  }, []);
  return data;
}

export const MATERIAL_STATUS_LABEL: Record<string, string> = {
  em_estoque: 'Em estoque',
  emprestado: 'Emprestado',
  reservado: 'Reservado',
  manutencao: 'Em manutenção',
  baixado: 'Baixado',
};

export const MATERIAL_STATUS_VARIANT: Record<string, string> = {
  em_estoque: 'bg-success text-success-foreground',
  emprestado: 'bg-warning text-warning-foreground',
  reservado: 'bg-primary text-primary-foreground',
  manutencao: 'bg-muted text-muted-foreground',
  baixado: 'bg-destructive text-destructive-foreground',
};

export const ARTE_STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  em_aprovacao: 'Em aprovação',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const ARTE_STATUS_VARIANT: Record<string, string> = {
  aguardando: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-primary text-primary-foreground',
  em_aprovacao: 'bg-warning text-warning-foreground',
  concluido: 'bg-success text-success-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

export const PRIORIDADE_VARIANT: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-primary text-primary-foreground',
  alta: 'bg-warning text-warning-foreground',
  urgente: 'bg-destructive text-destructive-foreground',
};