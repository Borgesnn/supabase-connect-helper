import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useMarcas, useMaterialFormatos, ARTE_STATUS_LABEL, ARTE_STATUS_VARIANT, PRIORIDADE_LABEL, PRIORIDADE_VARIANT } from '@/hooks/useMateriaisVisuais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Palette, Paperclip, LinkIcon, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Solicitacao {
  id: string; numero: number; titulo: string; subtitulo: string | null;
  texto_principal: string | null; cta: string | null; rodape: string | null;
  objetivo: string | null; publico_alvo: string | null;
  marca_id: string | null; cores: string | null; elementos: string | null; estilo: string | null;
  data_desejada: string | null; prioridade: string; status: string;
  solicitante_id: string | null; setor: string | null; created_at: string;
  observacoes_internas: string | null;
}

export default function SolicitacoesArtes() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isMarketing = role === 'admin' || role === 'operario';
  const marcas = useMarcas();
  const formatos = useMaterialFormatos();

  const [items, setItems] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPrioridade, setFilterPrioridade] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<Solicitacao | null>(null);
  const [detailFormatos, setDetailFormatos] = useState<any[]>([]);
  const [detailAnexos, setDetailAnexos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({ prioridade: 'media' });
  const [selectedFormatos, setSelectedFormatos] = useState<string[]>([]);
  const [linkAnexo, setLinkAnexo] = useState('');
  const [obsAnexo, setObsAnexo] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('arte_solicitacoes').select('*').order('created_at', { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ prioridade: 'media', setor: '', titulo: '' });
    setSelectedFormatos([]); setLinkAnexo(''); setObsAnexo(''); setFiles([]);
    setDialogOpen(true);
  };

  const toggleFmt = (id: string) => {
    setSelectedFormatos((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const submit = async () => {
    if (!user) return;
    if (!form.titulo?.trim()) { toast.error('Informe o título'); return; }
    if (!form.objetivo?.trim()) { toast.error('Informe o objetivo'); return; }
    setSaving(true);
    try {
      const payload: any = {
        solicitante_id: user.id,
        setor: form.setor || null,
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        texto_principal: form.texto_principal || null,
        cta: form.cta || null,
        rodape: form.rodape || null,
        objetivo: form.objetivo,
        publico_alvo: form.publico_alvo || null,
        marca_id: form.marca_id || null,
        cores: form.cores || null,
        elementos: form.elementos || null,
        estilo: form.estilo || null,
        data_desejada: form.data_desejada || null,
        prioridade: form.prioridade || 'media',
      };
      const { data: sol, error } = await supabase.from('arte_solicitacoes').insert(payload).select('id').single();
      if (error) throw error;
      const solId = sol.id;
      if (selectedFormatos.length) {
        await supabase.from('arte_solicitacao_formatos').insert(selectedFormatos.map((f) => ({ solicitacao_id: solId, formato_id: f })));
      }
      // anexos - arquivos
      for (const f of files) {
        const ext = f.name.split('.').pop();
        const path = `${solId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('artes-referencias').upload(path, f);
        if (upErr) throw upErr;
        const tipo = f.type.startsWith('image/') ? 'imagem' : f.type === 'application/pdf' ? 'pdf' : 'arquivo';
        await supabase.from('arte_solicitacao_anexos').insert({ solicitacao_id: solId, tipo, nome: f.name, path_or_url: path });
      }
      if (linkAnexo.trim()) {
        await supabase.from('arte_solicitacao_anexos').insert({ solicitacao_id: solId, tipo: 'link', nome: linkAnexo, path_or_url: linkAnexo, observacoes: obsAnexo || null });
      }
      toast.success('Solicitação enviada!');
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar');
    } finally { setSaving(false); }
  };

  const openDetail = async (s: Solicitacao) => {
    setDetailOpen(s);
    const [{ data: fmts }, { data: anx }] = await Promise.all([
      supabase.from('arte_solicitacao_formatos').select('formato_id').eq('solicitacao_id', s.id),
      supabase.from('arte_solicitacao_anexos').select('*').eq('solicitacao_id', s.id),
    ]);
    setDetailFormatos((fmts || []).map((r: any) => r.formato_id));
    setDetailAnexos(anx || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('arte_solicitacoes').update({ status: status as any, responsavel_id: user?.id }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Status atualizado'); load(); if (detailOpen?.id === id) setDetailOpen({ ...detailOpen!, status }); }
  };

  const filtered = items.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterPrioridade !== 'all' && i.prioridade !== filterPrioridade) return false;
    if (showOnlyMine && i.solicitante_id !== user?.id) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Artes</h1>
          <p className="text-sm text-muted-foreground">Briefing estruturado para criação de artes e materiais gráficos.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova solicitação</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(ARTE_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.entries(PRIORIDADE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showOnlyMine} onCheckedChange={(v) => setShowOnlyMine(!!v)} />
          Somente as minhas
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma solicitação encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition cursor-pointer" onClick={() => openDetail(s)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">#{String(s.numero).padStart(5, '0')}</p>
                    <h3 className="font-semibold leading-tight">{s.titulo}</h3>
                  </div>
                  <Badge className={cn(ARTE_STATUS_VARIANT[s.status])}>{ARTE_STATUS_LABEL[s.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className={cn(PRIORIDADE_VARIANT[s.prioridade])}>{PRIORIDADE_LABEL[s.prioridade]}</Badge>
                  {s.data_desejada && <Badge variant="outline">Prazo: {format(new Date(s.data_desejada), 'dd/MM/yyyy')}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Aberto em {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Nova Solicitação de Arte</DialogTitle>
            <DialogDescription>Preencha o briefing para agilizar a criação.</DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm border-b pb-1">Conteúdo da Arte</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Título *</Label><Input value={form.titulo ?? ''} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Subtítulo</Label><Input value={form.subtitulo ?? ''} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Texto principal</Label><Textarea value={form.texto_principal ?? ''} onChange={(e) => setForm({ ...form, texto_principal: e.target.value })} /></div>
              <div><Label>Call to Action</Label><Input value={form.cta ?? ''} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></div>
              <div><Label>Rodapé</Label><Input value={form.rodape ?? ''} onChange={(e) => setForm({ ...form, rodape: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Objetivo da campanha *</Label><Textarea placeholder="Ex.: Divulgação, Promoção, Lançamento…" value={form.objetivo ?? ''} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Público-alvo</Label><Input placeholder="Clientes, Consultores, Vendas…" value={form.publico_alvo ?? ''} onChange={(e) => setForm({ ...form, publico_alvo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Setor solicitante</Label><Input value={form.setor ?? ''} onChange={(e) => setForm({ ...form, setor: e.target.value })} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm border-b pb-1">Formato da Peça</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {formatos.map((f) => (
                <label key={f.id} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedFormatos.includes(f.id)} onCheckedChange={() => toggleFmt(f.id)} />
                  <span className="text-sm">{f.nome}{f.dimensoes ? ` (${f.dimensoes})` : ''}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm border-b pb-1">Identidade Visual</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Marca</Label>
                <Select value={form.marca_id ?? ''} onValueChange={(v) => setForm({ ...form, marca_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Estilo</Label><Input placeholder="Moderno, Minimalista…" value={form.estilo ?? ''} onChange={(e) => setForm({ ...form, estilo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Cores sugeridas</Label><Input placeholder="Ex.: Azul, Branco, Vermelho" value={form.cores ?? ''} onChange={(e) => setForm({ ...form, cores: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Elementos obrigatórios</Label><Textarea placeholder="Logos, selos, ícones…" value={form.elementos ?? ''} onChange={(e) => setForm({ ...form, elementos: e.target.value })} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm border-b pb-1">Referências</h3>
            <div>
              <Label>Anexar imagens / PDFs / arquivos</Label>
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} arquivo(s) selecionado(s)</p>}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Link de referência</Label><Input placeholder="https://…" value={linkAnexo} onChange={(e) => setLinkAnexo(e.target.value)} /></div>
              <div><Label>Observações do link</Label><Input value={obsAnexo} onChange={(e) => setObsAnexo(e.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm border-b pb-1">Prazo</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Data desejada de entrega</Label><Input type="date" value={form.data_desejada ?? ''} onChange={(e) => setForm({ ...form, data_desejada: e.target.value })} /></div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade ?? 'media'} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORIDADE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailOpen && (
            <>
              <DialogHeader>
                <DialogTitle>#{String(detailOpen.numero).padStart(5, '0')} — {detailOpen.titulo}</DialogTitle>
                <DialogDescription>Aberta em {format(new Date(detailOpen.created_at), 'dd/MM/yyyy HH:mm')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn(ARTE_STATUS_VARIANT[detailOpen.status])}>{ARTE_STATUS_LABEL[detailOpen.status]}</Badge>
                  <Badge className={cn(PRIORIDADE_VARIANT[detailOpen.prioridade])}>{PRIORIDADE_LABEL[detailOpen.prioridade]}</Badge>
                  {detailOpen.data_desejada && <Badge variant="outline">Entrega: {format(new Date(detailOpen.data_desejada), 'dd/MM/yyyy')}</Badge>}
                </div>
                {detailOpen.subtitulo && <p><strong>Subtítulo:</strong> {detailOpen.subtitulo}</p>}
                {detailOpen.texto_principal && <p><strong>Texto:</strong> {detailOpen.texto_principal}</p>}
                {detailOpen.cta && <p><strong>CTA:</strong> {detailOpen.cta}</p>}
                {detailOpen.rodape && <p><strong>Rodapé:</strong> {detailOpen.rodape}</p>}
                {detailOpen.objetivo && <p><strong>Objetivo:</strong> {detailOpen.objetivo}</p>}
                {detailOpen.publico_alvo && <p><strong>Público:</strong> {detailOpen.publico_alvo}</p>}
                {detailOpen.cores && <p><strong>Cores:</strong> {detailOpen.cores}</p>}
                {detailOpen.elementos && <p><strong>Elementos:</strong> {detailOpen.elementos}</p>}
                {detailOpen.estilo && <p><strong>Estilo:</strong> {detailOpen.estilo}</p>}
                {detailOpen.setor && <p><strong>Setor:</strong> {detailOpen.setor}</p>}
                {detailFormatos.length > 0 && (
                  <div><strong>Formatos:</strong> {detailFormatos.map((id) => formatos.find((f) => f.id === id)?.nome).filter(Boolean).join(', ')}</div>
                )}
                {detailAnexos.length > 0 && (
                  <div>
                    <strong>Referências:</strong>
                    <ul className="mt-1 space-y-1">
                      {detailAnexos.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-xs">
                          {a.tipo === 'link' ? <LinkIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                          {a.tipo === 'link' ? (
                            <a href={a.path_or_url} target="_blank" rel="noreferrer" className="text-primary underline">{a.nome || a.path_or_url}</a>
                          ) : (
                            <a href="#" onClick={async (e) => { e.preventDefault(); const { data } = await supabase.storage.from('artes-referencias').createSignedUrl(a.path_or_url, 3600); if (data?.signedUrl) window.open(data.signedUrl, '_blank'); }} className="text-primary underline">{a.nome}</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isMarketing && (
                  <div className="pt-3 border-t space-y-2">
                    <Label>Alterar status</Label>
                    <Select value={detailOpen.status} onValueChange={(v) => updateStatus(detailOpen.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ARTE_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}