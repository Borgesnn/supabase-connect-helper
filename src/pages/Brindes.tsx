import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Produto, Categoria } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Gift, AlertTriangle, Loader2 } from 'lucide-react';

export default function Brindes() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria_id: '',
    quantidade: 0,
    estoque_minimo: 0,
    localizacao: '',
    fornecedor: '',
    descricao: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchProdutos();
    fetchCategorias();
  }, []);

  async function fetchProdutos() {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*, categorias(*)')
        .order('nome');

      if (error) throw error;
      
      // Transform the data to match our Produto type
      const transformedData = data?.map(item => ({
        ...item,
        categoria: item.categorias as Categoria | undefined
      })) || [];
      
      setProdutos(transformedData);
    } catch (error) {
      console.error('Error fetching produtos:', error);
      toast({
        title: 'Erro ao carregar brindes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  }

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || p.categoria_id === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const getStockStatus = (quantidade: number, estoqueMinimo: number) => {
    if (quantidade === 0) return { label: 'Sem estoque', variant: 'destructive' as const };
    if (quantidade <= estoqueMinimo) return { label: 'Estoque baixo', variant: 'warning' as const };
    return { label: 'Normal', variant: 'success' as const };
  };

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        codigo: produto.codigo,
        nome: produto.nome,
        categoria_id: produto.categoria_id || '',
        quantidade: produto.quantidade,
        estoque_minimo: produto.estoque_minimo,
        localizacao: produto.localizacao || '',
        fornecedor: produto.fornecedor || '',
        descricao: produto.descricao || '',
      });
    } else {
      setEditingProduto(null);
      setFormData({
        codigo: '',
        nome: '',
        categoria_id: '',
        quantidade: 0,
        estoque_minimo: 0,
        localizacao: '',
        fornecedor: '',
        descricao: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const submitData = {
        ...formData,
        categoria_id: formData.categoria_id || null,
      };

      if (editingProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(submitData)
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast({ title: 'Brinde atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([submitData]);

        if (error) throw error;
        toast({ title: 'Brinde adicionado com sucesso!' });
      }

      setIsDialogOpen(false);
      fetchProdutos();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar brinde',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este brinde?')) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Brinde excluído com sucesso!' });
      fetchProdutos();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir brinde',
        description: error.message,
        variant: 'destructive',
      });
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
          <h1 className="text-3xl font-bold text-foreground">Brindes</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu estoque de brindes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Brinde
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? 'Editar Brinde' : 'Novo Brinde'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoria_id}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="0"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                  <Input
                    id="estoque_minimo"
                    type="number"
                    min="0"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="gradient-primary">
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduto ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProdutos.map((produto) => {
          const status = getStockStatus(produto.quantidade, produto.estoque_minimo);
          return (
            <Card key={produto.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{produto.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{produto.codigo}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{produto.quantidade}</span>
                  <Badge 
                    variant={status.variant === 'destructive' ? 'destructive' : 'default'}
                    className={status.variant === 'warning' ? 'bg-warning text-warning-foreground' : status.variant === 'success' ? 'bg-success' : ''}
                  >
                    {status.label}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  {produto.categoria && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria</span>
                      <span>{produto.categoria.nome}</span>
                    </div>
                  )}
                  {produto.localizacao && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Local</span>
                      <span>{produto.localizacao}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mín.</span>
                    <span>{produto.estoque_minimo}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(produto)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(produto.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProdutos.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum brinde encontrado</h3>
          <p className="text-muted-foreground">Tente ajustar os filtros ou adicione um novo brinde</p>
        </div>
      )}
    </div>
  );
}
