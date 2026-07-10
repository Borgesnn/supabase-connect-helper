import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, AlertTriangle, ArrowUpCircle, ArrowDownCircle, TrendingUp, DollarSign, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoRow[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroMarca, setFiltroMarca] = useState<string>('all');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all');
  const [filtroItem, setFiltroItem] = useState<string>('');

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

  const termo = filtroItem.trim().toLowerCase();
  const filtrados = produtos.filter((p) => {
    if (filtroMarca !== 'all' && p.marca_id !== filtroMarca) return false;
    if (filtroCategoria !== 'all' && p.categoria_id !== filtroCategoria) return false;
    if (termo && !p.nome.toLowerCase().includes(termo) && !p.codigo.toLowerCase().includes(termo)) return false;
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

  const temFiltro = filtroMarca !== 'all' || filtroCategoria !== 'all' || filtroItem !== '';
  const limpar = () => {
    setFiltroMarca('all');
    setFiltroCategoria('all');
    setFiltroItem('');
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
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Marca</Label>
            <Select value={filtroMarca} onValueChange={setFiltroMarca}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {marcas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Item</Label>
            <Input
              placeholder="Pesquisar por nome ou código..."
              value={filtroItem}
              onChange={(e) => setFiltroItem(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={limpar} disabled={!temFiltro}>
            <X className="w-4 h-4 mr-2" /> Limpar filtros
          </Button>
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
