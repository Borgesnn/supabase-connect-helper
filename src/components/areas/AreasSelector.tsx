import { useState } from 'react';
import { ChevronDown, ChevronRight, Crown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AreaTree, useAreas } from '@/hooks/useAreas';

interface AreasSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function AreasSelector({ selectedIds, onChange, disabled }: AreasSelectorProps) {
  const { tree, loading } = useAreas();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const toggleSelect = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const renderNode = (node: AreaTree, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const checked = selectedIds.includes(node.id);
    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
            checked && 'bg-primary/5'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            className="w-4 h-4 flex-shrink-0 text-muted-foreground"
          >
            {hasChildren ? (
              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : null}
          </button>
          <Checkbox
            checked={checked}
            onCheckedChange={() => toggleSelect(node.id)}
            disabled={disabled}
          />
          <span className={cn('text-sm flex-1', node.nivel === 0 && 'font-medium')}>
            {node.nome}
          </span>
          {node.is_diretoria && (
            <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] gap-1">
              <Crown className="w-3 h-3" /> Acesso total
            </Badge>
          )}
        </div>
        {hasChildren && isOpen && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4">Carregando áreas...</div>;

  return (
    <div className="border rounded-lg p-2 max-h-72 overflow-y-auto bg-card">
      {tree.map((n) => renderNode(n))}
    </div>
  );
}