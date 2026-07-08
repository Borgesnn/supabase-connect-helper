import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Handshake, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Emprestimo {
  id: string; numero: number; material_id: string; quantidade: number;
  responsavel_nome: string | null; setor: string | null;
  data_retirada: string; data_prevista_devolucao: string | null;
  data_devolucao: string | null; condicao_devolucao: string | null;
  observacoes: string | null; status: string;
}

export default function EmprestimosMateriais() {
  const { role } = useUserRole();
  const canManage = role === 'admin' || role === 'operario';

  const [items, setItems] = useState<Emprestimo[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ativos' | 'devolvidos' | 'todos'>('ativos');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialog, setReturnDialog] = useState<Emprestimo | null>(null);
  const [form, setForm] = useState<any>({ quantidade: 1 });
  const [retForm, setRetForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: m }] = await Promise.all([
      supabase.from('material_emprestimos').select('*').order('created_at', { ascending: false }),
      supabase.from('materiais_visuais').select('id, nome, quantidade, status').order('nome'),
    ]);
    setItems((e as any) || []);
    setMateriais(m || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ quantidade: 1 });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.material_id) { toast.error('Selecione o material'); return; }
    if (!form.responsavel_nome?.trim()) { toast.error('Informe o responsável'); return; }
    if (!form.quantidade || form.quantidade < 1) { toast.error('Quantidade inválida'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('registrar_emprestimo_material' as any, {
        p_material_id: form.material_id,
        p_quantidade: form.quantidade,
        p_responsavel_id: null,
        p_responsavel_nome: form.responsavel_nome,
        p_setor: form.setor || null,
        p_data_prevista: form.data_prevista_devolucao || null,
        p_observacoes: form.observacoes || null,
      });
      if (error) throw error;
      toast.success('Empréstimo registrado');
      setDialogOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const submitReturn = async () => {
    if (!returnDialog) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('devolver_emprestimo_material' as any, {
        p_emprestimo_id: returnDialog.id,
        p_condicao: retForm.condicao || null,
        p_observacoes: retForm.observacoes || null,
      });
      if (error) throw error;
      toast.success('Devolução registrada');
      setReturnDialog(null);
      setRetForm({});
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const filtered = items.filter((i) => filter === 'todos' || (filter === 'ativos' ? i.status === 'ativo' : i.status === 'devolvido'));
  const materialName = (id: string) => materiais.find((m) => m.id === id)?.nome || '—';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Empréstimos de Materiais</h1>
          <p className="text-sm text-muted-foreground">Controle de retiradas e devoluções de materiais de comunicação visual.</p>
        </div>
        {canManage && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo empréstimo</Button>}
      </div>

      <div className="flex gap-2">
        {(['ativos','devolvidos','todos'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'ativos' ? 'Ativos' : f === 'devolvidos' ? 'Devolvidos' : 'Todos'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum empréstimo encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">#{String(e.numero).padStart(5, '0')}</p>
                    <h3 className="font-semibold leading-tight flex items-center gap-2"><Handshake className="w-4 h-4" />{materialName(e.material_id)}</h3>
                  </div>
                  <Badge className={e.status === 'ativo' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                    {e.status === 'ativo' ? 'Emprestado' : 'Devolvido'}
                  </Badge>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Qtd:</strong> {e.quantidade}</p>
                  <p><strong>Responsável:</strong> {e.responsavel_nome} {e.setor && `(${e.setor})`}</p>
                  <p><strong>Retirada:</strong> {format(new Date(e.data_retirada), 'dd/MM/yyyy HH:mm')}</p>
                  {e.data_prevista_devolucao && <p><strong>Prev. devolução:</strong> {format(new Date(e.data_prevista_devolucao), 'dd/MM/yyyy')}</p>}
                  {e.data_devolucao && <p><strong>Devolvido em:</strong> {format(new Date(e.data_devolucao), 'dd/MM/yyyy HH:mm')}</p>}
                  {e.condicao_devolucao && <p><strong>Condição:</strong> {e.condicao_devolucao}</p>}
                  {e.observacoes && <p className="whitespace-pre-wrap">{e.observacoes}</p>}
                </div>
                {canManage && e.status === 'ativo' && (
                  <Button size="sm" variant="outline" onClick={() => { setReturnDialog(e); setRetForm({}); }}>
                    <ArrowRightLeft className="w-3 h-3 mr-2" />Registrar devolução
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo empréstimo</DialogTitle>
            <DialogDescription>Registre a retirada de um material.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Material *</Label>
              <Select value={form.material_id ?? ''} onValueChange={(v) => setForm({ ...form, material_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{materiais.filter((m) => m.quantidade > 0).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} (disp: {m.quantidade})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade *</Label><Input type="number" min={1} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: parseInt(e.target.value || '1') })} /></div>
              <div><Label>Prev. devolução</Label><Input type="date" value={form.data_prevista_devolucao ?? ''} onChange={(e) => setForm({ ...form, data_prevista_devolucao: e.target.value })} /></div>
            </div>
            <div><Label>Responsável pela retirada *</Label><Input value={form.responsavel_nome ?? ''} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} /></div>
            <div><Label>Setor</Label><Input value={form.setor ?? ''} onChange={(e) => setForm({ ...form, setor: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnDialog} onOpenChange={(o) => !o && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>Empréstimo #{returnDialog && String(returnDialog.numero).padStart(5, '0')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Condição do material</Label><Input placeholder="Bom, danificado, precisa reparo…" value={retForm.condicao ?? ''} onChange={(e) => setRetForm({ ...retForm, condicao: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={retForm.observacoes ?? ''} onChange={(e) => setRetForm({ ...retForm, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>Cancelar</Button>
            <Button onClick={submitReturn} disabled={saving}>Confirmar devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}