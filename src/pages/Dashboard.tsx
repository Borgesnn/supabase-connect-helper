import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, AlertTriangle, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalBrindes: number;
  estoqueNormal: number;
  estoqueBaixo: number;
  semEstoque: number;
}

interface CategoriaData {
  nome: string;
  quantidade: number;
}

const COLORS = ['hsl(213, 50%, 15%)', 'hsl(187, 80%, 42%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBrindes: 0,
    estoqueNormal: 0,
    estoqueBaixo: 0,
    semEstoque: 0,
  });
  const [categoriaData, setCategoriaData] = useState<CategoriaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: produtos, error } = await supabase
          .from('produtos')
          .select('*, categorias(nome)');

        if (error) throw error;

        if (produtos) {
          const totalBrindes = produtos.length;
          const semEstoque = produtos.filter(p => p.quantidade === 0).length;
          const estoqueBaixo = produtos.filter(p => p.quantidade > 0 && p.quantidade <= p.estoque_minimo).length;
          const estoqueNormal = produtos.filter(p => p.quantidade > p.estoque_minimo).length;

          setStats({ totalBrindes, estoqueNormal, estoqueBaixo, semEstoque });

          // Agrupar por categoria
          const categorias: Record<string, number> = {};
          produtos.forEach(p => {
            const catNome = p.categorias?.nome || 'Sem categoria';
            categorias[catNome] = (categorias[catNome] || 0) + p.quantidade;
          });

          setCategoriaData(
            Object.entries(categorias).map(([nome, quantidade]) => ({ nome, quantidade }))
          );
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do estoque de brindes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
            <div className="h-80">
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
