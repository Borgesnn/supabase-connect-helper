import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SETORES, isSetorPadrao } from '@/lib/setores';

interface SetorSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Opção "Todos" para uso em filtros */
  includeAll?: boolean;
  allLabel?: string;
  allValue?: string;
  /** Setores históricos existentes nos dados, exibidos além da lista padrão */
  legacyValues?: (string | null | undefined)[];
  className?: string;
  disabled?: boolean;
}

export function SetorSelect({
  value,
  onChange,
  placeholder = 'Selecione o setor',
  includeAll = false,
  allLabel = 'Todos',
  allValue = 'todos',
  legacyValues = [],
  className,
  disabled,
}: SetorSelectProps) {
  const legacy = Array.from(
    new Set(
      [...legacyValues, value].filter(
        (s): s is string => !!s && s !== allValue && !isSetorPadrao(s)
      )
    )
  ).sort();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={allValue}>{allLabel}</SelectItem>}
        {SETORES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
        {legacy.map((s) => (
          <SelectItem key={s} value={s}>
            {s} (histórico)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
