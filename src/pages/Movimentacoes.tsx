import { useEffect, useState } from 'react';
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
import { ArrowUpCircle, ArrowDownCircle, Loader2, Package, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  usuario_id: string;
  created_at: string;
  produtos?: {
    nome: string;
    codigo: string;
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
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacao, setObservacao] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [produtosRes, movRes] = await Promise.all([
        supabase.from('produtos').select('*').order('nome'),
        supabase
          .from('movimentacoes')
          .select('*, produtos(nome, codigo)')
          .order('created_at', { ascending: false })
          .limit(50),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto || !user) return;

    // Validação para saída
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
      // Registrar movimentação
      const { error: movError } = await supabase.from('movimentacoes').insert([{
        produto_id: selectedProduto,
        tipo,
        quantidade,
        observacao: observacao || null,
        usuario_id: user.id,
      }]);

      if (movError) throw movError;

      // Atualizar quantidade do produto
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

      // Reset form
      setSelectedProduto('');
      setQuantidade(1);
      setObservacao('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              {/* Tipo */}
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

              {/* Produto */}
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

              {/* Info do produto selecionado */}
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
                </div>
              )}

              {/* Quantidade */}
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              {/* Observação */}
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
                disabled={!selectedProduto || submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar {tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((mov) => (
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
                      <TableCell className="font-medium">
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.profiles?.nome || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimentacoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação registrada
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
