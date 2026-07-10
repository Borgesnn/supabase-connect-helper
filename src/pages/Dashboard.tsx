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
import { cn } from '@/lib/utils';
import { useMemo, useRef } from 'react';

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
    const n = p.categorias?.nome || 'Sem categoria';
    catMap[n] = (catMap[n] || 0) + p.quantidade;
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
        <StatsCard
          title="Estoque Normal"
          value={stats.estoqueNormal}
          icon={<TrendingUp className="w-6 h-6" />}
          variant="success"
        />
        <StatsCard
          title="Estoque Baixo"
          value={stats.estoqueBaixo}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="warning"
        />
        <StatsCard
          title="Sem Estoque"
          value={stats.semEstoque}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="destructive"
        />
        <StatsCard
          title="Valor Total do Estoque"
          value={formatBRL(stats.valorTotal)}
          icon={<DollarSign className="w-6 h-6" />}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque por Categoria</CardTitle>
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
                  <Bar dataKey="quantidade" fill="hsl(187, 80%, 42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
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
                  >
                    {categoriaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
    </div>
  );
}
