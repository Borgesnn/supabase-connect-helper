import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMarcas, useMaterialCategorias, MATERIAL_STATUS_LABEL } from '@/hooks/useMateriaisVisuais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, History } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function HistoricoMateriais() {
  const marcas = useMarcas();
  const categorias = useMaterialCategorias().data;
  const [emps, setEmps] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState(''); const [ate, setAte] = useState('');
  const [marca, setMarca] = useState('all');
  const [categoria, setCategoria] = useState('all');
  const [setor, setSetor] = useState('');
  const [status, setStatus] = useState('all');
  const [responsavel, setResponsavel] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: m }] = await Promise.all([
        supabase.from('material_emprestimos').select('*').order('created_at', { ascending: false }),
        supabase.from('materiais_visuais').select('id, nome, marca_id, categoria_id, status'),
      ]);
      setEmps(e || []); setMateriais(m || []); setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => emps.map((e) => {
    const m = materiais.find((x) => x.id === e.material_id);
    return {
      numero: e.numero,
      material: m?.nome || '—',
      marca_id: m?.marca_id, categoria_id: m?.categoria_id, mat_status: m?.status,
      quantidade: e.quantidade,
      responsavel: e.responsavel_nome || '—',
      setor: e.setor || '—',
      retirada: e.data_retirada,
      prevista: e.data_prevista_devolucao,
      devolucao: e.data_devolucao,
      condicao: e.condicao_devolucao || '',
      status: e.status,
      obs: e.observacoes || '',
    };
  }), [emps, materiais]);

  const filtered = rows.filter((r) => {
    if (de && new Date(r.retirada) < new Date(de)) return false;
    if (ate && new Date(r.retirada) > new Date(ate + 'T23:59:59')) return false;
    if (marca !== 'all' && r.marca_id !== marca) return false;
    if (categoria !== 'all' && r.categoria_id !== categoria) return false;
    if (setor && !(r.setor || '').toLowerCase().includes(setor.toLowerCase())) return false;
    if (status !== 'all' && r.mat_status !== status) return false;
    if (responsavel && !r.responsavel.toLowerCase().includes(responsavel.toLowerCase())) return false;
    return true;
  });

  const exportXlsx = () => {
    const data = filtered.map((r) => ({
      Nº: String(r.numero).padStart(5, '0'),
      Material: r.material,
      Marca: marcas.find((m) => m.id === r.marca_id)?.nome || '',
      Categoria: categorias.find((c) => c.id === r.categoria_id)?.nome || '',
      Quantidade: r.quantidade,
      Responsável: r.responsavel,
      Setor: r.setor,
      Retirada: format(new Date(r.retirada), 'dd/MM/yyyy HH:mm'),
      'Prev. devolução': r.prevista ? format(new Date(r.prevista), 'dd/MM/yyyy') : '',
      Devolução: r.devolucao ? format(new Date(r.devolucao), 'dd/MM/yyyy HH:mm') : '',
      Condição: r.condicao,
      Status: r.status,
      Observações: r.obs,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `historico-materiais-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" />Histórico</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de empréstimos e devoluções.</p>
        </div>
        <Button onClick={exportXlsx} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" />Exportar Excel</Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div><Label>De</Label><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <div>
            <Label>Marca</Label>
            <Select value={marca} onValueChange={setMarca}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status do material</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(MATERIAL_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Setor</Label><Input value={setor} onChange={(e) => setSetor(e.target.value)} /></div>
          <div><Label>Responsável</Label><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} /></div>
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {['Nº','Material','Qtd','Responsável','Setor','Retirada','Devolução','Status'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">#{String(r.numero).padStart(5, '0')}</td>
                  <td className="px-3 py-2">{r.material}</td>
                  <td className="px-3 py-2">{r.quantidade}</td>
                  <td className="px-3 py-2">{r.responsavel}</td>
                  <td className="px-3 py-2">{r.setor}</td>
                  <td className="px-3 py-2 text-xs">{format(new Date(r.retirada), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-3 py-2 text-xs">{r.devolucao ? format(new Date(r.devolucao), 'dd/MM/yyyy HH:mm') : '—'}</td>
                  <td className="px-3 py-2"><Badge variant={r.status === 'ativo' ? 'default' : 'secondary'}>{r.status}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Nenhum registro.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}