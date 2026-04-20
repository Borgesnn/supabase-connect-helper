import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Area {
  id: string;
  nome: string;
  parent_id: string | null;
  nivel: number;
  is_diretoria: boolean;
  ordem: number;
}

export interface AreaTree extends Area {
  children: AreaTree[];
}

function buildTree(areas: Area[]): AreaTree[] {
  const map = new Map<string, AreaTree>();
  areas.forEach((a) => map.set(a.id, { ...a, children: [] }));
  const roots: AreaTree[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: AreaTree[]) => {
    nodes.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [tree, setTree] = useState<AreaTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('ordem');
      if (!error && data) {
        setAreas(data as Area[]);
        setTree(buildTree(data as Area[]));
      }
      setLoading(false);
    })();
  }, []);

  return { areas, tree, loading };
}

export function useUserAreas(userId?: string | null) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id ?? null;
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [isDiretoria, setIsDiretoria] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('user_areas')
        .select('area_id, areas(is_diretoria)')
        .eq('user_id', targetId);
      const ids = (data || []).map((r: any) => r.area_id);
      setAreaIds(ids);
      setIsDiretoria((data || []).some((r: any) => r.areas?.is_diretoria));
      setLoading(false);
    })();
  }, [targetId]);

  return { areaIds, isDiretoria, loading };
}