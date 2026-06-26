import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FornecedorOption { id: string; nome: string; }

type Mode = 'select' | 'text';

interface Props {
  fornecedores: FornecedorOption[];
  mode: Mode;
  /** select: id; text: nome */
  value: string;
  onSelect?: (f: FornecedorOption) => void;
  onTextChange?: (t: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function FornecedorAutocomplete({
  fornecedores,
  mode,
  value,
  onSelect,
  onTextChange,
  onClear,
  placeholder = 'Pesquisar fornecedor...',
  className,
  disabled,
  emptyMessage = 'Nenhum fornecedor encontrado',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = mode === 'select' ? fornecedores.find((f) => f.id === value) : undefined;
  const inputValue =
    mode === 'select' ? (open ? query : selected ? selected.nome : '') : value;

  const suggestions = useMemo(() => {
    const term = mode === 'select' ? query : value;
    const q = normalize(term || '');
    if (!q) return fornecedores.slice(0, 50);
    return fornecedores.filter((f) => normalize(f.nome).includes(q)).slice(0, 50);
  }, [fornecedores, query, value, mode]);

  useEffect(() => setHighlight(0), [suggestions.length, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handlePick = (f: FornecedorOption) => {
    if (mode === 'select') {
      onSelect?.(f);
      setQuery('');
    } else {
      onTextChange?.(f.nome);
      onSelect?.(f);
    }
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      const f = suggestions[highlight];
      if (f) handlePick(f);
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
          } else {
            onTextChange?.(v);
            setOpen(true);
          }
        }}
        onKeyDown={handleKey}
        className="pl-10 pr-9"
      />
      {mode === 'select' && selected && !open && onClear && (
        <button
          type="button"
          onClick={() => { onClear(); setQuery(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          aria-label="Limpar"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      {mode === 'text' && value && onTextChange && !open && (
        <button
          type="button"
          onClick={() => onTextChange('')}
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
              suggestions.map((f, idx) => {
                const isSelected = mode === 'select' && f.id === value;
                const isHi = idx === highlight;
                return (
                  <button
                    type="button"
                    key={f.id}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => { e.preventDefault(); handlePick(f); }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                      isHi ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.nome}</span>
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