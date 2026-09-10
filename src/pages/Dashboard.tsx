import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, AlertTriangle, TrendingUp, DollarSign, X, ChevronDown, Search, Package, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalBrindes: number;
  estoqueNormal: number;
  estoqueBaixo: number;
  semEstoque: number;
  valorTotal: number;
}

interface CategoriaData {
  nome: string;
  quantidade: number;
}

interface ProdutoRow {
  id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
  valor_compra: number | null;
  categoria_id: string | null;
  marca_id: string | null;
  categorias: { nome: string } | null;
}

const COLORS = ['hsl(213, 50%, 15%)', 'hsl(187, 80%, 42%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'];

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

interface Opt { id: string; nome: string }

function MultiSelect({
  label, options, selected, onChange, placeholder,
}: {
  label: string;
  options: Opt[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const n = normalize(q);
    return n ? options.filter((o) => normalize(o.nome).includes(n)) : options;
  }, [options, q]);
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  const summary = selected.length === 0 ? placeholder : `${selected.length} selecionado${selected.length > 1 ? 's' : ''}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>{summary}</span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}...`} className="pl-8 h-8" />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum resultado</div>
          ) : filtered.map((o) => {
            const checked = selected.includes(o.id);
            return (
              <button key={o.id} type="button" onClick={() => toggle(o.id)}
                className={cn('w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-accent/50', checked && 'bg-accent/30')}>
                <Checkbox checked={checked} className="pointer-events-none" />
                <span className="flex-1 truncate">{o.nome}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItemAutocomplete({
  produtos, selectedIds, onChange,
}: {
  produtos: ProdutoRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const suggestions = useMemo(() => {
    const n = normalize(q);
    if (!n) return produtos.slice(0, 30);
    return produtos.filter((p) => normalize(p.nome).includes(n) || normalize(p.codigo).includes(n)).slice(0, 30);
  }, [produtos, q]);
  const add = (id: string) => {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    setQ('');
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar por nome ou código..."
        className="pl-10"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {suggestions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum brinde encontrado</div>
            ) : suggestions.map((p) => {
              const isSel = selectedIds.includes(p.id);
              return (
                <button key={p.id} type="button" onMouseDown={(e) => { e.preventDefault(); add(p.id); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-accent/50">
                  <Package className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium truncate">{p.nome}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{p.codigo}</span>
                    </div>
                  </div>
                  {isSel && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [catSelecionada, setCatSelecionada] = useState<string | null>(null);
  const [stockSelecionado, setStockSelecionado] = useState<'normal' | 'baixo' | 'zero' | null>(null);
  const [stockBusca, setStockBusca] = useState('');

  const [filtroMarcas, setFiltroMarcas] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('dash.marcas') || '[]'); } catch { return []; }
  });
  const [filtroCategorias, setFiltroCategorias] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('dash.categorias') || '[]'); } catch { return []; }
  });
  const [filtroItens, setFiltroItens] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('dash.itens') || '[]'); } catch { return []; }
  });

  useEffect(() => { sessionStorage.setItem('dash.marcas', JSON.stringify(filtroMarcas)); }, [filtroMarcas]);
  useEffect(() => { sessionStorage.setItem('dash.categorias', JSON.stringify(filtroCategorias)); }, [filtroCategorias]);
  useEffect(() => { sessionStorage.setItem('dash.itens', JSON.stringify(filtroItens)); }, [filtroItens]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [{ data: prods }, { data: mrc }, { data: cats }] = await Promise.all([
          supabase.from('produtos').select('id, codigo, nome, quantidade, estoque_minimo, valor_compra, categoria_id, marca_id, categorias(nome)'),
          supabase.from('marcas').select('id, nome').order('nome'),
          supabase.from('categorias').select('id, nome').order('nome'),
        ]);
        setProdutos((prods as any) || []);
        setMarcas(mrc || []);
        setCategorias(cats || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const filtrados = produtos.filter((p) => {
    if (filtroMarcas.length > 0 && (!p.marca_id || !filtroMarcas.includes(p.marca_id))) return false;
    if (filtroCategorias.length > 0 && (!p.categoria_id || !filtroCategorias.includes(p.categoria_id))) return false;
    if (filtroItens.length > 0 && !filtroItens.includes(p.id)) return false;
    return true;
  });

  const stats: DashboardStats = {
    totalBrindes: filtrados.length,
    semEstoque: filtrados.filter((p) => p.quantidade === 0).length,
    estoqueBaixo: filtrados.filter((p) => p.quantidade > 0 && p.quantidade <= p.estoque_minimo).length,
    estoqueNormal: filtrados.filter((p) => p.quantidade > p.estoque_minimo).length,
    valorTotal: filtrados.reduce((acc, p) => acc + (Number(p.valor_compra) || 0) * (p.quantidade || 0), 0),
  };

  const catMap: Record<string, number> = {};
  filtrados.forEach((p) => {
    if (!p.categorias?.nome) return;
    catMap[p.categorias.nome] = (catMap[p.categorias.nome] || 0) + p.quantidade;
  });
  const categoriaData: CategoriaData[] = Object.entries(catMap).map(([nome, quantidade]) => ({ nome, quantidade }));

  const temFiltro = filtroMarcas.length > 0 || filtroCategorias.length > 0 || filtroItens.length > 0;
  const limpar = () => { setFiltroMarcas([]); setFiltroCategorias([]); setFiltroItens([]); };

  const marcaNome = (id: string) => marcas.find((m) => m.id === id)?.nome || '';
  const categoriaNome = (id: string) => categorias.find((c) => c.id === id)?.nome || '';
  const itemNome = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    return p ? `${p.codigo} - ${p.nome}` : '';
  };

  const detalheItens = catSelecionada
    ? filtrados
        .filter((p) => p.categorias?.nome === catSelecionada)
        .sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0))
    : [];
  const detalheTotalQtd = detalheItens.reduce((a, p) => a + (p.quantidade || 0), 0);
  const detalheTotalValor = detalheItens.reduce((a, p) => a + (Number(p.valor_compra) || 0) * (p.quantidade || 0), 0);

  const stockItensBase = stockSelecionado === 'normal'
    ? filtrados.filter((p) => p.quantidade > p.estoque_minimo)
    : stockSelecionado === 'baixo'
      ? filtrados.filter((p) => p.quantidade > 0 && p.quantidade <= p.estoque_minimo)
      : stockSelecionado === 'zero'
        ? filtrados.filter((p) => p.quantidade === 0)
        : [];
  const stockBuscaNorm = normalize(stockBusca);
  const stockItens = (stockBuscaNorm
    ? stockItensBase.filter((p) => normalize(p.nome).includes(stockBuscaNorm) || normalize(p.codigo).includes(stockBuscaNorm))
    : stockItensBase
  ).sort((a, b) => (a.quantidade || 0) - (b.quantidade || 0));
  const stockConfig = stockSelecionado === 'normal'
    ? { titulo: 'Estoque Normal', desc: 'Brindes com quantidade acima do estoque mínimo.', alerta: null as string | null }
    : stockSelecionado === 'baixo'
      ? { titulo: 'Estoque Baixo', desc: 'Brindes com quantidade no limite ou abaixo do estoque mínimo.', alerta: 'Estes itens precisam de atenção: considere reposição.' }
      : { titulo: 'Sem Estoque', desc: 'Brindes com quantidade igual a zero.', alerta: 'Estes itens estão sem estoque disponível.' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do estoque de brindes</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Marca</Label>
              <MultiSelect label="Marcas" options={marcas} selected={filtroMarcas} onChange={setFiltroMarcas} placeholder="Todas" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <MultiSelect label="Categorias" options={categorias} selected={filtroCategorias} onChange={setFiltroCategorias} placeholder="Todas" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Item</Label>
              <ItemAutocomplete produtos={produtos} selectedIds={filtroItens} onChange={setFiltroItens} />
            </div>
            <Button variant="outline" onClick={limpar} disabled={!temFiltro}>
              <X className="w-4 h-4 mr-2" /> Limpar filtros
            </Button>
          </div>
          {temFiltro && (
            <div className="flex flex-wrap gap-2 pt-1">
              {filtroMarcas.map((id) => (
                <Badge key={`m-${id}`} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">Marca: {marcaNome(id)}</span>
                  <button type="button" onClick={() => setFiltroMarcas(filtroMarcas.filter((x) => x !== id))} className="rounded hover:bg-muted p-0.5" aria-label="Remover">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filtroCategorias.map((id) => (
                <Badge key={`c-${id}`} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">Categoria: {categoriaNome(id)}</span>
                  <button type="button" onClick={() => setFiltroCategorias(filtroCategorias.filter((x) => x !== id))} className="rounded hover:bg-muted p-0.5" aria-label="Remover">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filtroItens.map((id) => (
                <Badge key={`i-${id}`} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">Item: {itemNome(id)}</span>
                  <button type="button" onClick={() => setFiltroItens(filtroItens.filter((x) => x !== id))} className="rounded hover:bg-muted p-0.5" aria-label="Remover">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total de Brindes"
          value={stats.totalBrindes}
          icon={<Gift className="w-6 h-6" />}
          variant="default"
        />
        {stats.estoqueNormal > 0 && (
          <StatsCard
            title="Estoque Normal"
            value={stats.estoqueNormal}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
            onClick={() => { setStockSelecionado('normal'); setStockBusca(''); }}
          />
        )}
        {stats.estoqueBaixo > 0 && (
          <StatsCard
            title="Estoque Baixo"
            value={stats.estoqueBaixo}
            icon={<AlertTriangle className="w-6 h-6" />}
            variant="warning"
            onClick={() => { setStockSelecionado('baixo'); setStockBusca(''); }}
          />
        )}
        {stats.semEstoque > 0 && (
          <StatsCard
            title="Sem Estoque"
            value={stats.semEstoque}
            icon={<AlertTriangle className="w-6 h-6" />}
            variant="destructive"
            onClick={() => { setStockSelecionado('zero'); setStockBusca(''); }}
          />
        )}
        {stats.valorTotal > 0 && (
          <StatsCard
            title="Valor Total do Estoque"
            value={formatBRL(stats.valorTotal)}
            icon={<DollarSign className="w-6 h-6" />}
            variant="success"
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma barra para ver os brindes</p>
          </CardHeader>
          <CardContent>
            <div className="h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoriaData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nome" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="quantidade" fill="hsl(187, 80%, 42%)" radius={[4, 4, 0, 0]} className="cursor-pointer"
                    onClick={(d: any) => d?.nome && setCatSelecionada(d.nome)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma fatia para ver os brindes</p>
          </CardHeader>
          <CardContent>
            <div className="h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="quantidade"
                    nameKey="nome"
                    label={({ nome, percent }) => `${nome} ${(percent * 100).toFixed(0)}%`}
                    onClick={(d: any) => { const n = d?.nome ?? d?.payload?.nome; if (n) setCatSelecionada(n); }}
                    className="cursor-pointer"
                  >
                    {categoriaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de detalhes dos indicadores de estoque */}
      <Dialog open={!!stockSelecionado} onOpenChange={(o) => !o && setStockSelecionado(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{stockConfig.titulo}</DialogTitle>
            <DialogDescription>{stockConfig.desc} Conforme os filtros aplicados na Dashboard.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Quantidade de brindes</p>
              <p className="text-xl font-bold">{stockItensBase.length}</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={stockBusca}
                onChange={(e) => setStockBusca(e.target.value)}
                placeholder="Pesquisar por nome ou código..."
                className="pl-10"
              />
            </div>
          </div>

          {stockConfig.alerta && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-sm',
              stockSelecionado === 'baixo'
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            )}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{stockConfig.alerta}</span>
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brinde</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd. atual</TableHead>
                  <TableHead className="text-right">Estoque mín.</TableHead>
                  <TableHead className="text-right">Valor de compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItens.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate('/brindes')}
                    title="Ver no Catálogo de Brindes"
                  >
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.codigo}</TableCell>
                    <TableCell className="text-muted-foreground">{p.marca_id ? marcaNome(p.marca_id) : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.categorias?.nome || '—'}</TableCell>
                    <TableCell className={cn('text-right font-medium', stockSelecionado === 'zero' && 'text-destructive', stockSelecionado === 'baixo' && 'text-warning')}>
                      {p.quantidade}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.estoque_minimo}</TableCell>
                    <TableCell className="text-right">{p.valor_compra != null ? formatBRL(Number(p.valor_compra)) : '—'}</TableCell>
                  </TableRow>
                ))}
                {stockItens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum brinde encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setStockSelecionado(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!catSelecionada} onOpenChange={(o) => !o && setCatSelecionada(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Categoria: {catSelecionada}</DialogTitle>
            <DialogDescription>Brindes que compõem este resultado, conforme os filtros aplicados.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Itens diferentes</p>
              <p className="text-xl font-bold">{detalheItens.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Quantidade em estoque</p>
              <p className="text-xl font-bold">{detalheTotalQtd} un.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Valor total em estoque</p>
              <p className="text-xl font-bold">{formatBRL(detalheTotalValor)}</p>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brinde</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Valor de compra</TableHead>
                  <TableHead className="text-right">Valor total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalheItens.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.codigo}</TableCell>
                    <TableCell className="text-muted-foreground">{p.marca_id ? marcaNome(p.marca_id) : '—'}</TableCell>
                    <TableCell className="text-right">{p.quantidade}</TableCell>
                    <TableCell className="text-right">{p.valor_compra != null ? formatBRL(Number(p.valor_compra)) : '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {p.valor_compra != null ? formatBRL(Number(p.valor_compra) * (p.quantidade || 0)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {detalheItens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum brinde nesta categoria</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCatSelecionada(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
