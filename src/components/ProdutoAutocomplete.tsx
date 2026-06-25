import { useMemo, useRef, useState, useEffect } from 'react';
import { Produto } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Search, Check, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'select' | 'search';

interface Props {
  produtos: Produto[];
  mode: Mode;
  /** select mode: produto id; search mode: text value */
  value: string;
  onSelect?: (p: Produto) => void;
  onTextChange?: (t: string) => void;
  placeholder?: string;
  showStock?: boolean;
  showSetor?: boolean;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function ProdutoAutocomplete({
  produtos,
  mode,
  value,
  onSelect,
  onTextChange,
  placeholder = 'Pesquisar brinde...',
  showStock = false,
  showSetor = false,
  className,
  disabled = false,
  emptyMessage = 'Nenhum brinde encontrado',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = mode === 'select' ? produtos.find((p) => p.id === value) : undefined;

  // Sync input text
  const inputValue = mode === 'select' ? (open ? query : selected ? `${selected.codigo} - ${selected.nome}` : '') : value;

  const suggestions = useMemo(() => {
    const term = mode === 'select' ? query : value;
    const q = normalize(term || '');
    if (!q) return produtos.slice(0, 50);
    return produtos
      .filter((p) => normalize(p.nome).includes(q) || normalize(p.codigo).includes(q))
      .slice(0, 50);
  }, [produtos, query, value, mode]);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions.length, open]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSelect = (p: Produto) => {
    if (mode === 'select') {
      onSelect?.(p);
      setQuery('');
    } else {
      onTextChange?.(p.nome);
      onSelect?.(p);
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = suggestions[highlight];
      if (p) handleSelect(p);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value;
          if (mode === 'select') {
            setQuery(v);
            setOpen(true);
            if (v === '' && selected) {
              // allow clearing by deleting text
            }
          } else {
            onTextChange?.(v);
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-9"
      />
      {mode === 'select' && selected && !open && (
        <button
          type="button"
          onClick={() => {
            onSelect?.({ ...selected, id: '' } as Produto);
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          aria-label="Limpar"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto py-1">
            {suggestions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              suggestions.map((p, idx) => {
                const isSelected = mode === 'select' && p.id === value;
                const isHighlight = idx === highlight;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(p);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                      isHighlight ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                  >
                    <Package className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium truncate">{p.nome}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{p.codigo}</span>
                      </div>
                      {(showStock || showSetor) && (
                        <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                          {showStock && <span>Estoque: {p.quantidade}</span>}
                          {showSetor && p.localizacao && <span>Setor: {p.localizacao}</span>}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}