import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Pencil, Trash2, FileText, Paperclip, Upload, Download, X,
  MessageSquare, CheckCircle2, ShoppingBag, PackageCheck, History,
} from 'lucide-react';

type Status = 'em_negociacao' | 'cotacao_feita' | 'pedido_solicitado' | 'pedido_chegou';

const STATUS_INFO: Record<Status, { label: string; icon: any; badge: string; card: string }> = {
  em_negociacao:     { label: 'Em negociação',    icon: MessageSquare, badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',  card: 'border-l-amber-500' },
  cotacao_feita:     { label: 'Cotação feita',    icon: CheckCircle2,  badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',     card: 'border-l-blue-500' },
  pedido_solicitado: { label: 'Pedido solicitado',icon: ShoppingBag,   badge: 'bg-violet-500/10 text-violet-600 border-violet-500/20', card: 'border-l-violet-500' },
  pedido_chegou:     { label: 'Pedido chegou',    icon: PackageCheck,  badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', card: 'border-l-emerald-500' },
};
const STATUS_KEYS: Status[] = ['em_negociacao', 'cotacao_feita', 'pedido_solicitado', 'pedido_chegou'];

interface Fornecedor { id: string; nome: string; }
interface Produto { id: string; nome: string; codigo: string; }

interface Cotacao {
  id: string;
  nome: string;
  fornecedor_id: string | null;
  produto_id: string | null;
  status: Status;
  data_solicitacao: string | null;
  data_prevista: string | null;
  prazo_dias: number | null;
  quantidade: number | null;
  valor_estimado: number | null;
  valor_final: number | null;
  responsavel: string | null;
  observacoes: string | null;
  created_at: string;
  fornecedor?: Fornecedor | null;
  produto?: Produto | null;
}

interface Anexo {
  id: string; cotacao_id: string; nome_arquivo: string; arquivo_url: string;
  tipo: string | null; categoria: string | null; created_at: string;
}
interface Historico {
  id: string; status_anterior: string | null; status_novo: string;
  observacao: string | null; created_at: string; usuario_id: string;
}

const emptyForm = {
  nome: '', fornecedor_id: '', produto_id: '', status: 'em_negociacao' as Status,
  data_solicitacao: '', data_prevista: '', prazo_dias: '', quantidade: '',
  valor_estimado: '', valor_final: '', responsavel: '', observacoes: '',
};

const fmtMoney = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null) =>
  !d ? '—' : new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR');

export default function Cotacoes() {
  const { user } = useAuth();
  const { canManage } = useUserRole();

  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cotacao | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Cotacao | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [uploadCat, setUploadCat] = useState<'cotacao' | 'nota_fiscal'>('cotacao');
  const [uploading, setUploading] = useState(false);

  const [statusChange, setStatusChange] = useState<Status | null>(null);
  const [statusObs, setStatusObs] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [cRes, fRes, pRes] = await Promise.all([
      supabase.from('cotacoes').select('*, fornecedor:fornecedores(id,nome), produto:produtos(id,nome,codigo)').order('created_at', { ascending: false }),
      supabase.from('fornecedores').select('id,nome').order('nome'),
      supabase.from('produtos').select('id,nome,codigo').order('nome'),
    ]);
    if (cRes.error) toast.error('Erro ao carregar cotações');
    else setCotacoes((cRes.data ?? []) as any);
    setFornecedores((fRes.data ?? []) as Fornecedor[]);
    setProdutos((pRes.data ?? []) as Produto[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const counts = STATUS_KEYS.reduce((acc, s) => {
    acc[s] = cotacoes.filter(c => c.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  const filtered = cotacoes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nome.toLowerCase().includes(q) ||
      (c.fornecedor?.nome ?? '').toLowerCase().includes(q) ||
      (c.responsavel ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
    const matchForn = filterFornecedor === 'todos' || c.fornecedor_id === filterFornecedor;
    const matchDate = !filterDate || c.data_solicitacao === filterDate;
    return matchSearch && matchStatus && matchForn && matchDate;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, data_solicitacao: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const openEdit = (c: Cotacao) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      fornecedor_id: c.fornecedor_id ?? '',
      produto_id: c.produto_id ?? '',
      status: c.status,
      data_solicitacao: c.data_solicitacao ?? '',
      data_prevista: c.data_prevista ?? '',
      prazo_dias: c.prazo_dias?.toString() ?? '',
      quantidade: c.quantidade?.toString() ?? '',
      valor_estimado: c.valor_estimado?.toString() ?? '',
      valor_final: c.valor_final?.toString() ?? '',
      responsavel: c.responsavel ?? '',
      observacoes: c.observacoes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        fornecedor_id: form.fornecedor_id || null,
        produto_id: form.produto_id || null,
        status: form.status,
        data_solicitacao: form.data_solicitacao || null,
        data_prevista: form.data_prevista || null,
        prazo_dias: form.prazo_dias ? parseInt(form.prazo_dias) : null,
        quantidade: form.quantidade ? parseInt(form.quantidade) : null,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        valor_final: form.valor_final ? parseFloat(form.valor_final) : null,
        responsavel: form.responsavel || null,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from('cotacoes').update(payload).eq('id', editing.id);
        if (error) throw error;
        if (editing.status !== form.status) {
          await supabase.from('cotacao_historico').insert({
            cotacao_id: editing.id,
            status_anterior: editing.status,
            status_novo: form.status,
            usuario_id: user.id,
          });
        }
        toast.success('Cotação atualizada');
      } else {
        const { data, error } = await supabase.from('cotacoes').insert({ ...payload, created_by: user.id }).select().single();
        if (error) throw error;
        if (data) {
          await supabase.from('cotacao_historico').insert({
            cotacao_id: data.id,
            status_anterior: null,
            status_novo: form.status,
            observacao: 'Cotação criada',
            usuario_id: user.id,
          });
        }
        toast.success('Cotação criada');
      }
      setDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('cotacoes').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Cotação excluída'); loadAll(); }
    setDeleteId(null);
  };

  const openDetails = async (c: Cotacao) => {
    setSelected(c);
    setDetailOpen(true);
    const [aRes, hRes] = await Promise.all([
      supabase.from('cotacao_anexos').select('*').eq('cotacao_id', c.id).order('created_at', { ascending: false }),
      supabase.from('cotacao_historico').select('*').eq('cotacao_id', c.id).order('created_at', { ascending: false }),
    ]);
    setAnexos((aRes.data ?? []) as Anexo[]);
    setHistorico((hRes.data ?? []) as Historico[]);
  };

  const handleAnexoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${selected.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('cotacoes').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('cotacoes').getPublicUrl(path);
      const { error: insErr } = await supabase.from('cotacao_anexos').insert({
        cotacao_id: selected.id,
        nome_arquivo: file.name,
        arquivo_url: urlData.publicUrl,
        tipo: file.type,
        categoria: uploadCat,
        tamanho_bytes: file.size,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      toast.success('Anexo enviado');
      const { data } = await supabase.from('cotacao_anexos').select('*')
        .eq('cotacao_id', selected.id).order('created_at', { ascending: false });
      setAnexos((data ?? []) as Anexo[]);
    } catch (err: any) {
      toast.error(err.message ?? 'Erro no upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAnexo = async (id: string) => {
    const { error } = await supabase.from('cotacao_anexos').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else { setAnexos(prev => prev.filter(a => a.id !== id)); toast.success('Anexo removido'); }
  };

  const applyStatusChange = async () => {
    if (!selected || !statusChange || !user) return;
    const { error } = await supabase.from('cotacoes').update({ status: statusChange }).eq('id', selected.id);
    if (error) { toast.error('Erro ao alterar status'); return; }
    await supabase.from('cotacao_historico').insert({
      cotacao_id: selected.id,
      status_anterior: selected.status,
      status_novo: statusChange,
      observacao: statusObs || null,
      usuario_id: user.id,
    });
    toast.success('Status atualizado');
    setStatusChange(null);
    setStatusObs('');
    const updated = { ...selected, status: statusChange };
    setSelected(updated);
    setCotacoes(prev => prev.map(c => c.id === selected.id ? updated : c));
    const { data } = await supabase.from('cotacao_historico').select('*')
      .eq('cotacao_id', selected.id).order('created_at', { ascending: false });
    setHistorico((data ?? []) as Historico[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" /> Cotações
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhe o fluxo de cotações com fornecedores</p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova cotação
          </Button>
        )}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_KEYS.map(s => {
          const info = STATUS_INFO[s];
          const Icon = info.icon;
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(active ? 'todos' : s)}
              className={`text-left p-4 rounded-lg border bg-card border-l-4 ${info.card} hover:shadow-md transition-all ${active ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{info.label}</span>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-2">{counts[s]}</div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_KEYS.map(s => <SelectItem key={s} value={s}>{STATUS_INFO[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
          <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os fornecedores</SelectItem>
            {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solicitação</TableHead>
              <TableHead>Prevista</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Responsável</TableHead>
              {canManage && <TableHead className="w-24 text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma cotação encontrada</TableCell></TableRow>
            ) : filtered.map(c => {
              const info = STATUS_INFO[c.status];
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(c)}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.fornecedor?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="outline" className={info.badge}>{info.label}</Badge></TableCell>
                  <TableCell>{fmtDate(c.data_solicitacao)}</TableCell>
                  <TableCell>{fmtDate(c.data_prevista)}</TableCell>
                  <TableCell>{fmtMoney(c.valor_final ?? c.valor_estimado)}</TableCell>
                  <TableCell>{c.responsavel ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  {canManage && (
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cotação' : 'Nova cotação'}</DialogTitle>
            <DialogDescription>Preencha os dados da cotação</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Nome da cotação *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brinde vinculado</Label>
              <Select value={form.produto_id} onValueChange={v => setForm({ ...form, produto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_KEYS.map(s => <SelectItem key={s} value={s}>{STATUS_INFO[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável interno</Label>
              <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data solicitação</Label>
              <Input type="date" value={form.data_solicitacao} onChange={e => setForm({ ...form, data_solicitacao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data prevista</Label>
              <Input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prazo (dias)</Label>
              <Input type="number" min="0" value={form.prazo_dias} onChange={e => setForm({ ...form, prazo_dias: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor final (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_final} onChange={e => setForm({ ...form, valor_final: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.nome}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <Badge variant="outline" className={STATUS_INFO[selected.status].badge}>
                    {STATUS_INFO[selected.status].label}
                  </Badge>
                  {selected.fornecedor && <Badge variant="secondary">{selected.fornecedor.nome}</Badge>}
                </div>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Mudar status */}
                {canManage && (
                  <section className="p-3 bg-muted/40 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mudar status</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {STATUS_KEYS.filter(s => s !== selected.status).map(s => (
                        <Button key={s} size="sm" variant="outline" onClick={() => setStatusChange(s)}>
                          → {STATUS_INFO[s].label}
                        </Button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Dados */}
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Dados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Brinde:</span> {selected.produto ? `${selected.produto.codigo} — ${selected.produto.nome}` : '—'}</div>
                    <div><span className="text-muted-foreground">Responsável:</span> {selected.responsavel ?? '—'}</div>
                    <div><span className="text-muted-foreground">Solicitação:</span> {fmtDate(selected.data_solicitacao)}</div>
                    <div><span className="text-muted-foreground">Prevista:</span> {fmtDate(selected.data_prevista)}</div>
                    <div><span className="text-muted-foreground">Prazo:</span> {selected.prazo_dias ? `${selected.prazo_dias} dias` : '—'}</div>
                    <div><span className="text-muted-foreground">Quantidade:</span> {selected.quantidade ?? '—'}</div>
                    <div><span className="text-muted-foreground">Valor estimado:</span> {fmtMoney(selected.valor_estimado)}</div>
                    <div><span className="text-muted-foreground">Valor final:</span> {fmtMoney(selected.valor_final)}</div>
                  </div>
                </section>

                {selected.observacoes && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Observações</h3>
                    <p className="text-sm whitespace-pre-wrap">{selected.observacoes}</p>
                  </section>
                )}

                {/* Anexos */}
                <section>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Anexos ({anexos.length})
                    </h3>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Select value={uploadCat} onValueChange={v => setUploadCat(v as any)}>
                          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cotacao">Cotação</SelectItem>
                            <SelectItem value="nota_fiscal">Nota fiscal</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" onChange={handleAnexoUpload} disabled={uploading} />
                          <Button asChild size="sm" variant="outline" disabled={uploading}>
                            <span><Upload className="w-4 h-4 mr-2" />{uploading ? 'Enviando...' : 'Anexar'}</span>
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                  {anexos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
                      Nenhum anexo
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {anexos.map(a => (
                        <li key={a.id} className="flex items-center justify-between gap-2 p-2 border border-border rounded-md">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm truncate">{a.nome_arquivo}</p>
                              <Badge variant="secondary" className="text-[10px] mt-0.5">
                                {a.categoria === 'nota_fiscal' ? 'Nota fiscal' : 'Cotação'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                              <a href={a.arquivo_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                            </Button>
                            {canManage && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeAnexo(a.id)}>
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Histórico */}
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <History className="w-4 h-4" /> Histórico ({historico.length})
                  </h3>
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
                      Sem alterações registradas
                    </p>
                  ) : (
                    <ol className="space-y-2 border-l-2 border-border pl-4">
                      {historico.map(h => (
                        <li key={h.id} className="relative">
                          <div className="absolute -left-[1.4rem] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          <div className="text-sm">
                            <span className="font-medium">
                              {h.status_anterior ? `${STATUS_INFO[h.status_anterior as Status]?.label ?? h.status_anterior} → ` : ''}
                              {STATUS_INFO[h.status_novo as Status]?.label ?? h.status_novo}
                            </span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {new Date(h.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {h.observacao && <p className="text-xs text-muted-foreground mt-0.5">{h.observacao}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              {canManage && (
                <DialogFooter className="flex-row gap-2 sm:justify-end">
                  <Button variant="destructive" onClick={() => setDetailOpen(false)}>Fechar</Button>
                  <Button variant="outline" onClick={() => { setDetailOpen(false); openEdit(selected); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar mudança de status */}
      <Dialog open={!!statusChange} onOpenChange={o => !o && setStatusChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              {selected && statusChange && `${STATUS_INFO[selected.status].label} → ${STATUS_INFO[statusChange].label}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea rows={3} value={statusObs} onChange={e => setStatusObs(e.target.value)} />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="destructive" onClick={() => { setStatusChange(null); setStatusObs(''); }}>Cancelar</Button>
            <Button variant="outline" onClick={applyStatusChange}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Anexos e histórico vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
            <AlertDialogAction onClick={handleDelete} className="bg-background border border-border text-foreground hover:bg-muted">
              Sim
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0">
              Não
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
