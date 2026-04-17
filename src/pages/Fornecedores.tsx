import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Plus, Search, Pencil, Trash2, Truck, Star, Paperclip, Upload, ExternalLink, Download, X,
} from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
  logo_url: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  endereco: string | null;
  responsavel: string | null;
  categoria: string | null;
  prazo_entrega_dias: number | null;
  forma_pagamento: string | null;
  avaliacao: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

interface Anexo {
  id: string;
  fornecedor_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

const emptyForm = {
  nome: '', telefone: '', email: '', site: '', endereco: '', responsavel: '',
  categoria: '', prazo_entrega_dias: '', forma_pagamento: '', avaliacao: '0',
  observacoes: '', ativo: true, logo_url: '',
};

export default function Fornecedores() {
  const { user } = useAuth();
  const { canManage } = useUserRole();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchFornecedores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fornecedores').select('*').order('nome');
    if (error) toast.error('Erro ao carregar fornecedores');
    else setFornecedores((data ?? []) as Fornecedor[]);
    setLoading(false);
  };

  useEffect(() => { fetchFornecedores(); }, []);

  const categorias = Array.from(
    new Set(fornecedores.map(f => f.categoria).filter(Boolean))
  ) as string[];

  const filtered = fornecedores.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      f.nome.toLowerCase().includes(q) ||
      (f.email ?? '').toLowerCase().includes(q) ||
      (f.responsavel ?? '').toLowerCase().includes(q) ||
      (f.telefone ?? '').toLowerCase().includes(q);
    const matchCat = filterCategoria === 'todas' || f.categoria === filterCategoria;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditing(f);
    setForm({
      nome: f.nome,
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      site: f.site ?? '',
      endereco: f.endereco ?? '',
      responsavel: f.responsavel ?? '',
      categoria: f.categoria ?? '',
      prazo_entrega_dias: f.prazo_entrega_dias?.toString() ?? '',
      forma_pagamento: f.forma_pagamento ?? '',
      avaliacao: (f.avaliacao ?? 0).toString(),
      observacoes: f.observacoes ?? '',
      ativo: f.ativo,
      logo_url: f.logo_url ?? '',
    });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return form.logo_url || null;
    const ext = logoFile.name.split('.').pop();
    const path = `logos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('fornecedores').upload(path, logoFile);
    if (error) { toast.error('Erro no upload do logo'); return null; }
    const { data } = supabase.storage.from('fornecedores').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const logo_url = await uploadLogo();
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone || null,
        email: form.email || null,
        site: form.site || null,
        endereco: form.endereco || null,
        responsavel: form.responsavel || null,
        categoria: form.categoria || null,
        prazo_entrega_dias: form.prazo_entrega_dias ? parseInt(form.prazo_entrega_dias) : null,
        forma_pagamento: form.forma_pagamento || null,
        avaliacao: form.avaliacao ? parseInt(form.avaliacao) : 0,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
        logo_url,
      };
      if (editing) {
        const { error } = await supabase.from('fornecedores').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Fornecedor atualizado');
      } else {
        const { error } = await supabase.from('fornecedores').insert(payload);
        if (error) throw error;
        toast.success('Fornecedor cadastrado');
      }
      setDialogOpen(false);
      fetchFornecedores();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Fornecedor excluído'); fetchFornecedores(); }
    setDeleteId(null);
  };

  const openDetails = async (f: Fornecedor) => {
    setSelected(f);
    setDetailOpen(true);
    const { data } = await supabase
      .from('fornecedor_anexos').select('*')
      .eq('fornecedor_id', f.id).order('created_at', { ascending: false });
    setAnexos((data ?? []) as Anexo[]);
  };

  const handleAnexoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected || !user) return;
    setUploadingAnexo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `anexos/${selected.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('fornecedores').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('fornecedores').getPublicUrl(path);
      const { error: insErr } = await supabase.from('fornecedor_anexos').insert({
        fornecedor_id: selected.id,
        nome_arquivo: file.name,
        arquivo_url: urlData.publicUrl,
        tipo: file.type,
        tamanho_bytes: file.size,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      toast.success('Anexo enviado');
      const { data } = await supabase
        .from('fornecedor_anexos').select('*')
        .eq('fornecedor_id', selected.id).order('created_at', { ascending: false });
      setAnexos((data ?? []) as Anexo[]);
    } catch (err: any) {
      toast.error(err.message ?? 'Erro no upload');
    } finally {
      setUploadingAnexo(false);
      e.target.value = '';
    }
  };

  const removeAnexo = async (id: string) => {
    const { error } = await supabase.from('fornecedor_anexos').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else {
      setAnexos(prev => prev.filter(a => a.id !== id));
      toast.success('Anexo removido');
    }
  };

  const renderStars = (n: number | null) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= (n ?? 0) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" /> Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de parceiros e fornecedores de brindes</p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo fornecedor
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, responsável..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-24 text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum fornecedor encontrado</TableCell></TableRow>
            ) : filtered.map(f => (
              <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(f)}>
                <TableCell>
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {f.logo_url
                      ? <img src={f.logo_url} alt={f.nome} className="w-full h-full object-cover" />
                      : <Truck className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>{f.categoria || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{f.responsavel || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{f.telefone || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{f.email || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{renderStars(f.avaliacao)}</TableCell>
                <TableCell>
                  {f.ativo
                    ? <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Ativo</Badge>
                    : <Badge variant="secondary">Inativo</Badge>}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(f.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Logotipo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border">
                  {logoFile
                    ? <img src={URL.createObjectURL(logoFile)} alt="preview" className="w-full h-full object-cover" />
                    : form.logo_url
                      ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                      : <Truck className="w-6 h-6 text-muted-foreground" />}
                </div>
                <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Vestuário" />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Prazo de entrega (dias)</Label>
              <Input type="number" min="0" value={form.prazo_entrega_dias}
                onChange={e => setForm({ ...form, prazo_entrega_dias: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Input value={form.forma_pagamento} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })}
                placeholder="Ex: 30 dias, PIX, Boleto" />
            </div>
            <div className="space-y-2">
              <Label>Avaliação interna</Label>
              <Select value={form.avaliacao} onValueChange={v => setForm({ ...form, avaliacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n === 0 ? 'Sem avaliação' : `${n} estrela${n > 1 ? 's' : ''}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>Fornecedor ativo</Label>
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
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selected.logo_url
                      ? <img src={selected.logo_url} alt={selected.nome} className="w-full h-full object-cover" />
                      : <Truck className="w-7 h-7 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl">{selected.nome}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {selected.categoria && <Badge variant="secondary">{selected.categoria}</Badge>}
                      {selected.ativo
                        ? <Badge className="bg-primary/10 text-primary border-primary/20">Ativo</Badge>
                        : <Badge variant="secondary">Inativo</Badge>}
                      {renderStars(selected.avaliacao)}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Dados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Responsável:</span> {selected.responsavel || '—'}</div>
                    <div><span className="text-muted-foreground">Telefone:</span> {selected.telefone || '—'}</div>
                    <div><span className="text-muted-foreground">E-mail:</span> {selected.email || '—'}</div>
                    <div>
                      <span className="text-muted-foreground">Site:</span>{' '}
                      {selected.site
                        ? <a href={selected.site} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            {selected.site} <ExternalLink className="w-3 h-3" />
                          </a>
                        : '—'}
                    </div>
                    <div className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> {selected.endereco || '—'}</div>
                    <div><span className="text-muted-foreground">Prazo entrega:</span> {selected.prazo_entrega_dias ? `${selected.prazo_entrega_dias} dias` : '—'}</div>
                    <div><span className="text-muted-foreground">Pagamento:</span> {selected.forma_pagamento || '—'}</div>
                  </div>
                </section>

                {selected.observacoes && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Observações</h3>
                    <p className="text-sm whitespace-pre-wrap">{selected.observacoes}</p>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Anexos ({anexos.length})
                    </h3>
                    {canManage && (
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={handleAnexoUpload} disabled={uploadingAnexo} />
                        <Button asChild size="sm" variant="outline" disabled={uploadingAnexo}>
                          <span><Upload className="w-4 h-4 mr-2" />{uploadingAnexo ? 'Enviando...' : 'Anexar'}</span>
                        </Button>
                      </label>
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
                            <span className="text-sm truncate">{a.nome_arquivo}</span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                              <a href={a.arquivo_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                            </Button>
                            {canManage && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                                onClick={() => removeAnexo(a.id)}>
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
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

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os anexos vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-background border border-border text-foreground hover:bg-muted">
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
