import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Produto } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, ArrowDownCircle, Loader2, History, DollarSign, FileSpreadsheet, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  setor: string | null;
  usuario_id: string;
  created_at: string;
  produtos?: {
    nome: string;
    codigo: string;
    valor_compra: number | null;
  };
  profiles?: {
    nome: string;
  };
}

export default function Movimentacoes() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [observacao, setObservacao] = useState('');
  const [setor, setSetor] = useState('');
  const { toast } = useToast();

  // Filters
  const [filterDataInicio, setFilterDataInicio] = useState<string>(() =>
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [filterDataFim, setFilterDataFim] = useState<string>(() =>
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [filterSetor, setFilterSetor] = useState<string>('todos');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [produtosRes, movRes] = await Promise.all([
        supabase.from('produtos').select('*').order('nome'),
        supabase
          .from('movimentacoes')
          .select('*, produtos(nome, codigo, valor_compra)')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (movRes.error) throw movRes.error;

      setProdutos(produtosRes.data || []);
      setMovimentacoes(movRes.data as Movimentacao[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedProdutoData = produtos.find(p => p.id === selectedProduto);

  // Unique setores for filter dropdown
  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    movimentacoes.forEach(m => { if (m.setor) s.add(m.setor); });
    return Array.from(s).sort();
  }, [movimentacoes]);

  // Filtered movimentacoes
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      const data = new Date(m.created_at);
      const inicio = filterDataInicio ? new Date(filterDataInicio + 'T00:00:00') : null;
      const fim = filterDataFim ? new Date(filterDataFim + 'T23:59:59') : null;
      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;
      if (filterSetor && filterSetor !== 'todos' && m.setor !== filterSetor) return false;
      return true;
    });
  }, [movimentacoes, filterDataInicio, filterDataFim, filterSetor]);

  // Total gasto (only saídas)
  const totalGasto = useMemo(() => {
    return movimentacoesFiltradas
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => {
        const valor = m.produtos?.valor_compra || 0;
        return acc + m.quantidade * valor;
      }, 0);
  }, [movimentacoesFiltradas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto || !user || quantidade <= 0) return;

    if (tipo === 'saida' && selectedProdutoData && quantidade > selectedProdutoData.quantidade) {
      toast({
        title: 'Quantidade insuficiente',
        description: `Estoque disponível: ${selectedProdutoData.quantidade}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error: movError } = await supabase.from('movimentacoes').insert([{
        produto_id: selectedProduto,
        tipo,
        quantidade,
        observacao: observacao || null,
        setor: setor || null,
        usuario_id: user.id,
      }]);

      if (movError) throw movError;

      const novaQuantidade = tipo === 'entrada'
        ? (selectedProdutoData?.quantidade || 0) + quantidade
        : (selectedProdutoData?.quantidade || 0) - quantidade;

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ quantidade: novaQuantidade })
        .eq('id', selectedProduto);

      if (updateError) throw updateError;

      toast({
        title: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`,
      });

      setSelectedProduto('');
      setQuantidade(0);
      setObservacao('');
      setSetor('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar movimentação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const data = movimentacoesFiltradas.map(m => ({
      'Data': format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Brinde': m.produtos?.nome || '-',
      'Setor': m.setor || '-',
      'Tipo': m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      'Quantidade': m.quantidade,
      'Valor de Compra (R$)': Number(m.produtos?.valor_compra || 0).toFixed(2).replace('.', ','),
      'Valor Total (R$)': (m.quantidade * (m.produtos?.valor_compra || 0)).toFixed(2).replace('.', ','),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');

    const colWidths = [
      { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 10 },
      { wch: 12 }, { wch: 18 }, { wch: 18 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `movimentacoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Movimentações</h1>
        <p className="text-muted-foreground mt-1">Registre entradas e saídas de estoque</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {tipo === 'entrada' ? (
                <ArrowUpCircle className="w-5 h-5 text-success" />
              ) : (
                <ArrowDownCircle className="w-5 h-5 text-destructive" />
              )}
              Nova Movimentação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipo === 'entrada' ? 'default' : 'outline'}
                  className={tipo === 'entrada' ? 'bg-success hover:bg-success/90 flex-1' : 'flex-1'}
                  onClick={() => setTipo('entrada')}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'saida' ? 'default' : 'outline'}
                  className={tipo === 'saida' ? 'bg-destructive hover:bg-destructive/90 flex-1' : 'flex-1'}
                  onClick={() => setTipo('saida')}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Saída
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo} - {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProdutoData && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estoque atual:</span>
                    <span className="font-medium">{selectedProdutoData.quantidade}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Estoque mínimo:</span>
                    <span className="font-medium">{selectedProdutoData.estoque_minimo}</span>
                  </div>
                  {selectedProdutoData.valor_compra != null && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Valor de compra:</span>
                      <span className="font-medium">
                        R$ {Number(selectedProdutoData.valor_compra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Setor</Label>
                <Input
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  placeholder="Ex: Marketing, RH, Vendas..."
                />
              </div>

              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Motivo da movimentação..."
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={!selectedProduto || quantidade <= 0 || submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar {tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History + Filters */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Movimentações
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/50 rounded-lg">
              <Filter className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="space-y-1">
                <Label className="text-xs">Data início</Label>
                <Input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data fim</Label>
                <Input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {setoresUnicos.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total gasto */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total gasto (saídas no período)</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {movimentacoesFiltradas.filter(m => m.tipo === 'saida').length} saídas
              </Badge>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoesFiltradas.map((mov) => {
                    const valorCompra = mov.produtos?.valor_compra || 0;
                    const valorTotal = mov.quantidade * valorCompra;
                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm">
                          {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}
                            className={mov.tipo === 'entrada' ? 'bg-success' : ''}
                          >
                            {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{mov.produtos?.nome}</p>
                            <p className="text-xs text-muted-foreground">{mov.produtos?.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {mov.setor || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                        </TableCell>
                        <TableCell className="text-sm">
                          R$ {Number(valorCompra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {movimentacoesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação encontrada no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
