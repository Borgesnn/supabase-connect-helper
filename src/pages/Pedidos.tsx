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
import { Plus, Check, X, Clock, ShoppingCart, Loader2, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserAreas } from '@/hooks/useAreas';
import { ProdutoAutocomplete } from '@/components/ProdutoAutocomplete';
import { useTamanhos, fetchProdutoTamanhos, type ProdutoTamanhoRow } from '@/hooks/useTamanhos';

interface Pedido {
  id: string;
  produto_id: string;
  quantidade: number;
  solicitante_id: string;
  motivo: string | null;
  status: string;
  prioridade?: string;
  data_aprovacao: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    codigo: string;
    quantidade: number;
    controla_tamanho?: boolean;
  };
  profiles?: {
    nome: string;
  };
  pedido_itens?: { id: string; tamanho_id: string | null; quantidade: number; tamanhos?: { nome: string } | null }[];
}

export default function Pedidos() {
  const { user } = useAuth();
  const { canManage } = useUserRole();
  const { isDiretoria } = useUserAreas();
  const { tamanhos } = useTamanhos();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPedidoId, setRejectingPedidoId] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 0,
    motivo: '',
  });
  const [requestItens, setRequestItens] = useState<{ tamanho_id: string; quantidade: number }[]>([]);
  const [produtoTamanhoStock, setProdutoTamanhoStock] = useState<ProdutoTamanhoRow[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pedidosRes, produtosRes] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*, produtos(nome, codigo, quantidade, controla_tamanho), pedido_itens(id, tamanho_id, quantidade, tamanhos(nome))')
          .order('prioridade', { ascending: false }) // diretoria > normal
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

  const selectedProdutoObj = produtos.find(p => p.id === formData.produto_id);
  const selectedControla = (selectedProdutoObj as any)?.controla_tamanho === true;

  useEffect(() => {
    if (selectedControla && formData.produto_id) {
      fetchProdutoTamanhos(formData.produto_id).then((rows) => {
        setProdutoTamanhoStock(rows);
        setRequestItens([{ tamanho_id: '', quantidade: 0 }]);
      }).catch(() => setProdutoTamanhoStock([]));
    } else {
      setProdutoTamanhoStock([]);
      setRequestItens([]);
    }
  }, [formData.produto_id, selectedControla]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedControla && formData.quantidade <= 0) {
      toast({
        title: 'Quantidade obrigatória',
        description: 'Informe uma quantidade maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedControla) {
      const validItens = requestItens.filter(i => i.tamanho_id && i.quantidade > 0);
      if (validItens.length === 0) {
        toast({ title: 'Informe pelo menos um tamanho com quantidade > 0', variant: 'destructive' });
        return;
      }
      for (const it of validItens) {
        const disp = produtoTamanhoStock.find(s => s.tamanho_id === it.tamanho_id)?.quantidade ?? 0;
        if (it.quantidade > disp) {
          const nome = tamanhos.find(t => t.id === it.tamanho_id)?.nome || '';
          toast({ title: `Quantidade indisponível no tamanho ${nome}`, description: `Disponível: ${disp}`, variant: 'destructive' });
          return;
        }
      }
    }

    if (formData.motivo.trim().length < 50) {
      toast({
        title: 'Motivo muito curto',
        description: 'O motivo deve ter no mínimo 50 caracteres. Ex: nome do cliente, tipo do brinde, motivo.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      if (selectedControla) {
        const itens = requestItens
          .filter(i => i.tamanho_id && i.quantidade > 0)
          .map(i => ({ tamanho_id: i.tamanho_id, quantidade: i.quantidade }));
        const { error } = await supabase.rpc('create_pedido_com_itens', {
          p_solicitante_id: user.id,
          p_produto_id: formData.produto_id,
          p_motivo: formData.motivo || null,
          p_prioridade: isDiretoria ? 'diretoria' : 'normal',
          p_itens: itens as any,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pedidos').insert([{
          produto_id: formData.produto_id,
          quantidade: formData.quantidade,
          solicitante_id: user.id,
          motivo: formData.motivo || null,
          prioridade: isDiretoria ? 'diretoria' : 'normal',
        }]);
        if (error) throw error;
      }

      toast({ title: 'Pedido criado com sucesso!' });
      setIsDialogOpen(false);
      setFormData({ produto_id: '', quantidade: 0, motivo: '' });
      setRequestItens([]);
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

  const handleStatusChange = async (pedidoId: string, newStatus: 'aprovada' | 'rejeitada', motivoRejeicao?: string) => {
    if (!user || !canManage) return;

    try {
      const { error: rpcError } = await supabase.rpc('approve_pedido_atomic', {
        p_pedido_id: pedidoId,
        p_status: newStatus,
        p_aprovador_id: user.id,
        p_motivo_rejeicao: newStatus === 'rejeitada' ? (motivoRejeicao ?? null) : null,
      });
      if (rpcError) throw rpcError;

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

  const openRejectDialog = (pedidoId: string) => {
    setRejectingPedidoId(pedidoId);
    setRejectMotivo('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingPedidoId || !rejectMotivo.trim()) {
      toast({ title: 'Informe o motivo da rejeição', variant: 'destructive' });
      return;
    }
    await handleStatusChange(rejectingPedidoId, 'rejeitada', rejectMotivo);
    setRejectDialogOpen(false);
    setRejectingPedidoId(null);
    setRejectMotivo('');
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
                <ProdutoAutocomplete
                  produtos={produtos}
                  mode="select"
                  value={formData.produto_id}
                  onSelect={(p) => setFormData({ ...formData, produto_id: p.id })}
                  onClear={() => setFormData({ ...formData, produto_id: '' })}
                  placeholder="Pesquisar brinde..."
                  showStock
                />
              </div>

              {selectedControla ? (
                <div className="space-y-2 rounded-md border p-3">
                  <Label className="text-sm">Tamanhos <span className="text-destructive">*</span></Label>
                  {requestItens.map((it, idx) => {
                    const disp = produtoTamanhoStock.find(s => s.tamanho_id === it.tamanho_id)?.quantidade ?? 0;
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <Select
                          value={it.tamanho_id}
                          onValueChange={(v) => {
                            const c = [...requestItens]; c[idx] = { ...c[idx], tamanho_id: v }; setRequestItens(c);
                          }}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Tamanho" /></SelectTrigger>
                          <SelectContent>
                            {tamanhos
                              .filter(t => it.tamanho_id === t.id || !requestItens.some(r => r.tamanho_id === t.id))
                              .filter(t => (produtoTamanhoStock.find(s => s.tamanho_id === t.id)?.quantidade ?? 0) > 0 || t.id === it.tamanho_id)
                              .map(t => {
                                const s = produtoTamanhoStock.find(x => x.tamanho_id === t.id)?.quantidade ?? 0;
                                return <SelectItem key={t.id} value={t.id}>{t.nome} — disp: {s}</SelectItem>;
                              })}
                          </SelectContent>
                        </Select>
                        <Input type="number" min="0" max={disp} value={it.quantidade} placeholder="Qtd"
                          onChange={(e) => { const c = [...requestItens]; c[idx] = { ...c[idx], quantidade: Math.min(disp, parseInt(e.target.value) || 0) }; setRequestItens(c); }}
                          className="h-9" />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9"
                          onClick={() => setRequestItens(requestItens.filter((_, i) => i !== idx))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setRequestItens([...requestItens, { tamanho_id: '', quantidade: 0 }])}
                    disabled={requestItens.length >= produtoTamanhoStock.filter(s => s.quantidade > 0).length}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar tamanho
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Quantidade <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivo <span className="text-destructive">*</span></Label>
                <Textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Ex: nome do cliente, tipo do brinde, motivo"
                  rows={3}
                  minLength={50}
                  required
                />
                <p className={`text-xs ${formData.motivo.trim().length < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formData.motivo.trim().length}/50 caracteres (mínimo)
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={
                  !formData.produto_id || submitting || formData.motivo.trim().length < 50 ||
                  (selectedControla
                    ? requestItens.filter(i => i.tamanho_id && i.quantidade > 0).length === 0
                    : formData.quantidade <= 0)
                } className="gradient-primary">
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
          <Card
            key={pedido.id}
            className={`hover:shadow-lg transition-all duration-200 ${
              pedido.prioridade === 'diretoria' ? 'border-warning border-2 ring-1 ring-warning/30' : ''
            }`}
          >
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
                <div className="flex flex-col items-end gap-1">
                  {pedido.prioridade === 'diretoria' && (
                    <Badge className="bg-warning text-warning-foreground gap-1">
                      <Crown className="w-3 h-3" /> Diretoria
                    </Badge>
                  )}
                  {getStatusBadge(pedido.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">{pedido.quantidade}</span>
                </div>
                {pedido.pedido_itens && pedido.pedido_itens.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {pedido.pedido_itens.map(i => (
                      <Badge key={i.id} variant="outline">
                        {i.tamanhos?.nome || 'sem tamanho'}: {i.quantidade}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solicitante</span>
                  <span>{pedido.profiles?.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filial</span>
                  <span>{pedido.motivo?.includes('Filial:') ? pedido.motivo.match(/Filial:\s*([^|]*)/)?.[1]?.trim() || '-' : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span>{format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                {pedido.motivo && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Motivo:</p>
                    <p className="text-sm">{pedido.motivo.includes('Motivo:') ? pedido.motivo.match(/Motivo:\s*(.*)/)?.[1]?.trim() || pedido.motivo : pedido.motivo}</p>
                  </div>
                )}
              </div>

              {pedido.status === 'pendente' && canManage && (
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
                    onClick={() => openRejectDialog(pedido.id)}
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
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Rejeição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Por que está rejeitando este pedido?</Label>
              <Textarea
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                placeholder="Informe o motivo da rejeição..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectMotivo.trim()}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
