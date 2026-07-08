import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useMaterialCategorias, useMarcas, MATERIAL_STATUS_LABEL, MATERIAL_STATUS_VARIANT } from '@/hooks/useMateriaisVisuais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AreasSelector } from '@/components/areas/AreasSelector';
import { SignedImage } from '@/components/SignedImage';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  nome: string;
  categoria_id: string | null;
  marca_id: string | null;
  codigo: string | null;
  quantidade: number;
  local_armazenamento: string | null;
  foto_path: string | null;
  estado_conservacao: string | null;
  observacoes: string | null;
  status: string;
}

const STATUS_OPTIONS = ['em_estoque','emprestado','reservado','manutencao','baixado'];

export default function CatalogoMateriais() {
  const { role } = useUserRole();
  const isAdmin = role === 'admin';
  const categorias = useMaterialCategorias().data;
  const marcas = useMarcas();

  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterMarca, setFilterMarca] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<Partial<Material>>({});
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('materiais_visuais').select('*').order('nome');
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', quantidade: 0, status: 'em_estoque' });
    setSelectedAreas([]);
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = async (m: Material) => {
    setEditing(m);
    setForm(m);
    setFile(null);
    const { data } = await supabase.from('material_areas').select('area_id').eq('material_id', m.id);
    setSelectedAreas((data || []).map((r: any) => r.area_id));
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome?.trim()) { toast.error('Informe o nome'); return; }
    setSaving(true);
    try {
      let foto_path = form.foto_path ?? null;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('materiais-visuais').upload(path, file);
        if (upErr) throw upErr;
        foto_path = path;
      }
      const payload: any = {
        nome: form.nome,
        categoria_id: form.categoria_id || null,
        marca_id: form.marca_id || null,
        codigo: form.codigo || null,
        quantidade: form.quantidade ?? 0,
        local_armazenamento: form.local_armazenamento || null,
        estado_conservacao: form.estado_conservacao || null,
        observacoes: form.observacoes || null,
        status: form.status || 'em_estoque',
        foto_path,
      };
      let materialId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('materiais_visuais').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('materiais_visuais').insert(payload).select('id').single();
        if (error) throw error;
        materialId = data.id;
      }
      if (materialId) {
        await supabase.from('material_areas').delete().eq('material_id', materialId);
        if (selectedAreas.length) {
          await supabase.from('material_areas').insert(selectedAreas.map((a) => ({ material_id: materialId!, area_id: a })));
        }
      }
      toast.success('Material salvo');
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('materiais_visuais').delete().eq('id', deleteId);
    if (error) toast.error(error.message);
    else { toast.success('Material excluído'); load(); }
    setDeleteId(null);
  };

  const filtered = items.filter((i) => {
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase()) && !(i.codigo || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'all' && i.categoria_id !== filterCat) return false;
    if (filterMarca !== 'all' && i.marca_id !== filterMarca) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Materiais Visuais</h1>
          <p className="text-sm text-muted-foreground">Wind Banners, Roll Ups, Tendas, Backdrops e demais materiais de comunicação.</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo material</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{MATERIAL_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum material encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => {
            const cat = categorias.find((c) => c.id === m.categoria_id);
            const marca = marcas.find((mm) => mm.id === m.marca_id);
            return (
              <Card key={m.id} className="overflow-hidden hover:shadow-md transition">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  <SignedImage bucket="materiais-visuais" source={m.foto_path} className="w-full h-full object-cover" alt={m.nome} fallback={<ImageIcon className="w-10 h-10 text-muted-foreground" />} />
                  <Badge className={cn('absolute top-2 right-2', MATERIAL_STATUS_VARIANT[m.status])}>{MATERIAL_STATUS_LABEL[m.status]}</Badge>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div>
                    <h3 className="font-semibold leading-tight">{m.nome}</h3>
                    <p className="text-xs text-muted-foreground">{cat?.nome || 'Sem categoria'} {marca ? `• ${marca.nome}` : ''}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Disponível</span>
                    <span className="font-semibold">{m.quantidade}</span>
                  </div>
                  {m.local_armazenamento && <p className="text-xs text-muted-foreground truncate">📍 {m.local_armazenamento}</p>}
                  {isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(m)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar material' : 'Novo material'}</DialogTitle>
            <DialogDescription>Preencha as informações do material de comunicação visual.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria_id ?? ''} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Select value={form.marca_id ?? ''} onValueChange={(v) => setForm({ ...form, marca_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.codigo ?? ''} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={0} value={form.quantidade ?? 0} onChange={(e) => setForm({ ...form, quantidade: parseInt(e.target.value || '0') })} />
            </div>
            <div>
              <Label>Local de armazenamento</Label>
              <Input value={form.local_armazenamento ?? ''} onChange={(e) => setForm({ ...form, local_armazenamento: e.target.value })} />
            </div>
            <div>
              <Label>Estado de conservação</Label>
              <Input placeholder="Novo, Bom, Regular…" value={form.estado_conservacao ?? ''} onChange={(e) => setForm({ ...form, estado_conservacao: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Status</Label>
              <Select value={form.status ?? 'em_estoque'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{MATERIAL_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Foto</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {form.foto_path && !file && <span className="text-xs text-muted-foreground">Arquivo atual mantido</span>}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Setores com acesso</Label>
              <p className="text-xs text-muted-foreground mb-2">Vazio ou "Geral" = visível para todos os usuários.</p>
              <AreasSelector selectedIds={selectedAreas} onChange={setSelectedAreas} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}><Upload className="w-4 h-4 mr-2" />{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Todos os empréstimos vinculados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmDelete}>Sim</AlertDialogAction>
            <AlertDialogCancel className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Não</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}