import { useAreas, Area } from '@/hooks/useAreas';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SetorSubsetorSelectorProps {
  setorId: string;
  subsetorId: string;
  onSetorChange: (id: string) => void;
  onSubsetorChange: (id: string) => void;
  disabled?: boolean;
}

export function SetorSubsetorSelector({
  setorId,
  subsetorId,
  onSetorChange,
  onSubsetorChange,
  disabled,
}: SetorSubsetorSelectorProps) {
  const { areas, loading } = useAreas();

  if (loading) return <p className="text-sm text-muted-foreground">Carregando setores...</p>;

  const setores = areas.filter((a) => a.parent_id === null);
  const subsetores = setorId ? areas.filter((a) => a.parent_id === setorId) : [];
  const selectedSetor = setores.find((s) => s.id === setorId);
  const needsSubsetor = selectedSetor && (selectedSetor.nome === 'Caminhões' || selectedSetor.nome === 'Máquinas');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Setor</Label>
        <Select
          value={setorId}
          onValueChange={(v) => {
            onSetorChange(v);
            onSubsetorChange('');
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o setor" />
          </SelectTrigger>
          <SelectContent>
            {setores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsSubsetor && (
        <div className="space-y-2">
          <Label>Subsetor <span className="text-destructive">*</span></Label>
          <Select value={subsetorId} onValueChange={onSubsetorChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o subsetor" />
            </SelectTrigger>
            <SelectContent>
              {subsetores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function useSetorDefaults(areas: Area[]) {
  const geralId = areas.find((a) => a.nome === 'Geral' && a.parent_id === null)?.id || '';
  return { geralId };
}