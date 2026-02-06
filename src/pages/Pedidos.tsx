import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
import { Plus, Check, X, Clock, ShoppingCart, Loader2, PackageCheck, CheckCircle2 } from 'lucide-react';
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

type StatusFilter = 'all' | 'pendente' | 'aprovado' | 'finalizado' | 'rejeitada' | 'concluido';

export default function Pedidos() {
  const { user } = useAuth();
  const { canManage, isUsuario, loading: roleLoading } = useUserRole();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 1,
    motivo: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading) {
      fetchData();
    }
  }, [roleLoading]);

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

  // Filtra pedidos baseado no papel do usuário
  const visiblePedidos = pedidos.filter(p => {
    if (canManage) {
      // Admin/operário: NÃO vê finalizado nem concluido
      return !['finalizado', 'concluido'].includes(p.status);
    } else {
      // Usuário: vê apenas seus próprios pedidos (RLS já filtra, mas reforça)
      return p.solicitante_id === user?.id;
    }
  });

  const filteredPedidos = visiblePedidos.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );

  const validateQuantidade = (qty: number): boolean => {
    return Number.isInteger(qty) && qty > 0 && qty <= 100000;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateQuantidade(formData.quantidade)) {
      toast({ title: 'Quantidade inválida (1-100.000)', variant: 'destructive' });
      return;
    }

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

  // Etapa 1 → 2: Aprovar pedido (deduz estoque)
  const handleAprovar = async (pedidoId: string) => {
    if (!user) return;

    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (!pedido || !pedido.produtos) return;

      if (!validateQuantidade(pedido.quantidade)) {
        toast({ title: 'Quantidade do pedido é inválida', variant: 'destructive' });
        return;
      }

      const novaQuantidade = pedido.produtos.quantidade - pedido.quantidade;

      if (novaQuantidade < 0) {
        toast({
          title: 'Estoque insuficiente',
          description: `Estoque disponível: ${pedido.produtos.quantidade}`,
          variant: 'destructive',
        });
        return;
      }

      // Atualizar status para aprovado
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
          aprovador_id: user.id,
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      // Deduzir estoque
      const { error: prodError } = await supabase
        .from('produtos')
        .update({ quantidade: novaQuantidade })
        .eq('id', pedido.produto_id);

      if (prodError) throw prodError;

      // Registrar movimentação de saída
      await supabase.from('movimentacoes').insert([{
        produto_id: pedido.produto_id,
        tipo: 'saida',
        quantidade: pedido.quantidade,
        observacao: `Pedido #${pedido.id.slice(0, 8)} aprovado`,
        usuario_id: user.id,
      }]);

      toast({ title: 'Pedido aprovado!' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar pedido',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Rejeitar pedido
  const handleRejeitar = async (pedidoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({
          status: 'rejeitada',
          data_aprovacao: new Date().toISOString(),
          aprovador_id: user.id,
        })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({ title: 'Pedido rejeitado' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao rejeitar pedido',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Etapa 2 → 3: Finalizar pedido (admin/operário entrega o produto)
  const handleFinalizar = async (pedidoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'finalizado' })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({ title: 'Pedido finalizado! Aguardando confirmação do solicitante.' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar pedido',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Etapa 3 → Concluído: Solicitante confirma recebimento
  const handleConfirmarRecebimento = async (pedidoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'concluido' })
        .eq('id', pedidoId);

      if (error) throw error;

      toast({ title: 'Recebimento confirmado! Pedido concluído.' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao confirmar recebimento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
            <Clock className="w-3 h-3 mr-1" />Pendente
          </Badge>
        );
      case 'aprovado':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            <Check className="w-3 h-3 mr-1" />Aprovado
          </Badge>
        );
      case 'finalizado':
        return (
          <Badge className="bg-success">
            <PackageCheck className="w-3 h-3 mr-1" />Finalizado
          </Badge>
        );
      case 'concluido':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
            <CheckCircle2 className="w-3 h-3 mr-1" />Concluído
          </Badge>
        );
      case 'rejeitada':
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Etapas visuais do progresso
  const getProgressSteps = (status: string) => {
    const steps = [
      { label: 'Solicitado', done: true },
      { label: 'Aprovado', done: ['aprovado', 'finalizado', 'concluido'].includes(status) },
      { label: 'Finalizado', done: ['finalizado', 'concluido'].includes(status) },
    ];
    return steps;
  };

  // Filtros disponíveis baseado no papel
  const getFilterOptions = (): { value: StatusFilter; label: string }[] => {
    if (canManage) {
      return [
        { value: 'all', label: 'Todos' },
        { value: 'pendente', label: 'Pendentes' },
        { value: 'aprovado', label: 'Aprovados' },
        { value: 'rejeitada', label: 'Rejeitados' },
      ];
    }
    return [
      { value: 'all', label: 'Todos' },
      { value: 'pendente', label: 'Pendentes' },
      { value: 'aprovado', label: 'Aprovados' },
      { value: 'finalizado', label: 'Finalizados' },
      { value: 'concluido', label: 'Concluídos' },
      { value: 'rejeitada', label: 'Rejeitados' },
    ];
  };

  if (loading || roleLoading) {
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
          <p className="text-muted-foreground mt-1">
            {canManage ? 'Gerencie solicitações de produtos' : 'Acompanhe suas solicitações'}
          </p>
        </div>
        {canManage && (
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
                    max="100000"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: Math.max(1, Math.min(100000, parseInt(e.target.value) || 1)) })}
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
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {getFilterOptions().map(({ value, label }) => (
          <Button
            key={value}
            variant={filterStatus === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(value)}
            className={filterStatus === value ? 'gradient-primary' : ''}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Pedidos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPedidos.map((pedido) => {
          const steps = getProgressSteps(pedido.status);
          
          return (
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
                {/* Barra de progresso das etapas */}
                {pedido.status !== 'rejeitada' && (
                  <div className="flex items-center gap-1">
                    {steps.map((step, index) => (
                      <div key={step.label} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                              step.done
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className={`text-[10px] mt-1 text-center ${
                            step.done ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 -mt-4 ${
                            steps[index + 1].done ? 'bg-primary' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

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

                {/* Etapa 1: Pendente → Admin/operário pode aprovar ou rejeitar */}
                {pedido.status === 'pendente' && canManage && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      className="flex-1 bg-success hover:bg-success/90"
                      onClick={() => handleAprovar(pedido.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleRejeitar(pedido.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}

                {/* Etapa 2: Aprovado → Admin/operário pode finalizar */}
                {pedido.status === 'aprovado' && canManage && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      className="w-full gradient-primary"
                      onClick={() => handleFinalizar(pedido.id)}
                    >
                      <PackageCheck className="w-4 h-4 mr-1" />
                      Finalizar Entrega
                    </Button>
                  </div>
                )}

                {/* Etapa 3: Finalizado → Solicitante confirma recebimento */}
                {pedido.status === 'finalizado' && isUsuario && pedido.solicitante_id === user?.id && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      className="w-full bg-success hover:bg-success/90"
                      onClick={() => handleConfirmarRecebimento(pedido.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Confirmar Recebimento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPedidos.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">
            {canManage ? 'Não há pedidos para gerenciar no momento' : 'Você ainda não fez nenhuma solicitação'}
          </p>
        </div>
      )}
    </div>
  );
}
