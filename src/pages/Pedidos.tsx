import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Produto } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, X, Clock, ShoppingCart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: string;
  produto_id: string;
  quantidade: number;
  solicitante_id: string;
  motivo: string | null;
  status: string;
  data_aprovacao: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    codigo: string;
    quantidade: number;
  };
  profiles?: {
    nome: string;
  };
}

export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 1,
    motivo: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pedidosRes, produtosRes] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*, produtos(nome, codigo, quantidade)')
          .order('created_at', { ascending: false }),
        supabase.from('produtos').select('*').order('nome'),
      ]);

      if (pedidosRes.error) throw pedidosRes.error;
      if (produtosRes.error) throw produtosRes.error;

      setPedidos(pedidosRes.data as Pedido[] || []);
      setProdutos(produtosRes.data || []);
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

  const filteredPedidos = pedidos.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('pedidos').insert([{
        produto_id: formData.produto_id,
        quantidade: formData.quantidade,
        solicitante_id: user.id,
        motivo: formData.motivo || null,
      }]);

      if (error) throw error;

      toast({ title: 'Pedido criado com sucesso!' });
      setIsDialogOpen(false);
      setFormData({ produto_id: '', quantidade: 1, motivo: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (pedidoId: string, newStatus: 'aprovada' | 'rejeitada') => {
    if (!user) return;

    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (!pedido) return;

      // Update pedido status
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: newStatus,
          data_aprovacao: new Date().toISOString(),
          aprovador_id: user.id,
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      // If approved, update product quantity
      if (newStatus === 'aprovada' && pedido.produtos) {
        const novaQuantidade = pedido.produtos.quantidade - pedido.quantidade;
        
        if (novaQuantidade < 0) {
          toast({
            title: 'Estoque insuficiente',
            description: 'Quantidade em estoque menor que a solicitada',
            variant: 'destructive',
          });
          return;
        }

        const { error: prodError } = await supabase
          .from('produtos')
          .update({ quantidade: novaQuantidade })
          .eq('id', pedido.produto_id);

        if (prodError) throw prodError;

        // Register movement
        await supabase.from('movimentacoes').insert([{
          produto_id: pedido.produto_id,
          tipo: 'saida',
          quantidade: pedido.quantidade,
          observacao: `Pedido #${pedido.id.slice(0, 8)} aprovado`,
          usuario_id: user.id,
        }]);
      }

      toast({ 
        title: newStatus === 'aprovada' ? 'Pedido aprovado!' : 'Pedido rejeitado',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar pedido',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovada':
        return <Badge className="bg-success"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitada':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gerencie solicitações de produtos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Solicitação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo} - {p.nome} (Estoque: {p.quantidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Descreva o motivo da solicitação..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!formData.produto_id || submitting} className="gradient-primary">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar Solicitação
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pendente', 'aprovada', 'rejeitada'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className={filterStatus === status ? 'gradient-primary' : ''}
          >
            {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Pedidos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPedidos.map((pedido) => (
          <Card key={pedido.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {pedido.produtos?.nome}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {pedido.produtos?.codigo}
                    </p>
                  </div>
                </div>
                {getStatusBadge(pedido.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">{pedido.quantidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solicitante</span>
                  <span>{pedido.profiles?.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span>{format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                {pedido.motivo && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Motivo:</p>
                    <p className="text-sm">{pedido.motivo}</p>
                  </div>
                )}
              </div>

              {pedido.status === 'pendente' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => handleStatusChange(pedido.id, 'aprovada')}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleStatusChange(pedido.id, 'rejeitada')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPedidos.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">Crie um novo pedido para solicitar produtos</p>
        </div>
      )}
    </div>
  );
}
