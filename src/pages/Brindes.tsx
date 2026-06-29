import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2, Gift, AlertTriangle, Loader2, Upload, X, ShoppingCart, Check } from 'lucide-react';
import { SetorSubsetorSelector } from '@/components/areas/SetorSubsetorSelector';
import { useUserAreas, useAreas } from '@/hooks/useAreas';
import { SignedImage } from '@/components/SignedImage';
import { ProdutoAutocomplete } from '@/components/ProdutoAutocomplete';
import { FornecedorAutocomplete, type FornecedorOption } from '@/components/FornecedorAutocomplete';

interface Marca { id: string; nome: string }

export default function Brindes() {
  const { user } = useAuth();
  const { canManage, isAdmin, loading: roleLoading } = useUserRole();
  const { isDiretoria } = useUserAreas();
  const { areas } = useAreas();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [produtoAreasMap, setProdutoAreasMap] = useState<Record<string, string[]>>({});
  const [fornecedoresList, setFornecedoresList] = useState<FornecedorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterMarca, setFilterMarca] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productAreaIds, setProductAreaIds] = useState<string[]>([]);
  const [productSetorId, setProductSetorId] = useState('');
  const [productSubsetorId, setProductSubsetorId] = useState('');

  // Gestão inline de marcas (admin no diálogo)
  const [newMarcaNome, setNewMarcaNome] = useState('');
  const [savingMarca, setSavingMarca] = useState(false);

  // Gestão inline de categorias (apenas admin)
  const [newCategoriaNome, setNewCategoriaNome] = useState('');
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [deletingCategoriaId, setDeletingCategoriaId] = useState<string | null>(null);

  // Categorias pendentes no diálogo (só salvas no banco ao confirmar)
  const [dialogCategorias, setDialogCategorias] = useState<Categoria[]>([]);
  const [pendingCategoriaAdds, setPendingCategoriaAdds] = useState<{ tempId: string; nome: string }[]>([]);
  const [pendingCategoriaDeletes, setPendingCategoriaDeletes] = useState<string[]>([]);
  
  // Estado para solicitação
  const [requestQuantidade, setRequestQuantidade] = useState(1);
  const [requestMotivo, setRequestMotivo] = useState('');
  const [requestNome, setRequestNome] = useState('');
  const [requestSobrenome, setRequestSobrenome] = useState('');
  const [requestFilial, setRequestFilial] = useState('');
  const [entregarOutraPessoa, setEntregarOutraPessoa] = useState(false);
  const [outraPessoaNome, setOutraPessoaNome] = useState('');
  const [outraPessoaSobrenome, setOutraPessoaSobrenome] = useState('');
  const [userProfileName, setUserProfileName] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria_id: '',
    marca_id: '',
    quantidade: 0,
    estoque_minimo: 0,
    localizacao: '',
    fornecedor: '',
    descricao: '',
    valor_compra: '' as string,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchProdutos();
    fetchCategorias();
    fetchMarcas();
    fetchFornecedoresList();
  }, []);

  useEffect(() => {
    if (user) fetchUserProfile();
  }, [user]);

  async function fetchUserProfile() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single();
      if (data) setUserProfileName(data.nome);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

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

      // Fetch produto_areas in one go for setor display
      const ids = transformedData.map((p: any) => p.id);
      if (ids.length > 0) {
        const { data: pa } = await supabase
          .from('produto_areas')
          .select('produto_id, area_id')
          .in('produto_id', ids);
        const map: Record<string, string[]> = {};
        (pa || []).forEach((r: any) => {
          (map[r.produto_id] ||= []).push(r.area_id);
        });
        setProdutoAreasMap(map);
      } else {
        setProdutoAreasMap({});
      }
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

  async function fetchFornecedoresList() {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id,nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setFornecedoresList((data ?? []) as FornecedorOption[]);
    } catch (error) {
      console.error('Error fetching fornecedores:', error);
    }
  }

  async function fetchMarcas() {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      setMarcas((data || []) as Marca[]);
    } catch (error) {
      console.error('Error fetching marcas:', error);
    }
  }

  async function handleAddMarca() {
    const nome = newMarcaNome.trim();
    if (!nome) return;
    if (marcas.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) {
      toast({ title: 'Marca já existe', variant: 'destructive' });
      return;
    }
    setSavingMarca(true);
    try {
      const { data, error } = await supabase.from('marcas').insert({ nome }).select('id, nome').single();
      if (error) throw error;
      setMarcas((prev) => [...prev, data as Marca].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData((prev) => ({ ...prev, marca_id: (data as Marca).id }));
      setNewMarcaNome('');
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar marca', description: error.message, variant: 'destructive' });
    } finally {
      setSavingMarca(false);
    }
  }

  async function handleDeleteMarca(id: string, nome: string) {
    if (!confirm(`Excluir a marca "${nome}"? Brindes vinculados ficarão sem marca.`)) return;
    try {
      const { error } = await supabase.from('marcas').delete().eq('id', id);
      if (error) throw error;
      setMarcas((prev) => prev.filter((m) => m.id !== id));
      if (formData.marca_id === id) setFormData((prev) => ({ ...prev, marca_id: '' }));
      toast({ title: 'Marca excluída' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir marca', description: error.message, variant: 'destructive' });
    }
  }

  async function handleAddCategoria() {
    const nome = newCategoriaNome.trim();
    if (!nome) return;
    if (dialogCategorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      toast({ title: 'Categoria já existe', variant: 'destructive' });
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const novaCat: Categoria = { id: tempId, nome, created_at: new Date().toISOString() };
    setDialogCategorias((prev) => [...prev, novaCat].sort((a, b) => a.nome.localeCompare(b.nome)));
    setPendingCategoriaAdds((prev) => [...prev, { tempId, nome }]);
    setNewCategoriaNome('');
  }

  async function handleDeleteCategoria(id: string, nome: string) {
    if (!confirm(`Excluir a categoria "${nome}"? Brindes vinculados ficarão sem categoria.`)) return;
    setDeletingCategoriaId(id);
    setDialogCategorias((prev) => prev.filter((c) => c.id !== id));
    if (id.startsWith('temp-')) {
      setPendingCategoriaAdds((prev) => prev.filter((a) => a.tempId !== id));
    } else {
      setPendingCategoriaDeletes((prev) => [...prev, id]);
    }
    if (formData.categoria_id === id) {
      setFormData((prev) => ({ ...prev, categoria_id: '' }));
    }
    setTimeout(() => setDeletingCategoriaId(null), 300);
  }

  async function handleSaveCategorias() {
    if (pendingCategoriaDeletes.length === 0 && pendingCategoriaAdds.length === 0) return;
    setSavingCategoria(true);
    try {
      // Excluir categorias removidas
      if (pendingCategoriaDeletes.length > 0) {
        const { error } = await supabase.from('categorias').delete().in('id', pendingCategoriaDeletes);
        if (error) throw error;
      }
      // Inserir novas categorias
      const tempToReal = new Map<string, string>();
      if (pendingCategoriaAdds.length > 0) {
        const { data, error } = await supabase
          .from('categorias')
          .insert(pendingCategoriaAdds.map((a) => ({ nome: a.nome })))
          .select('id, nome');
        if (error) throw error;
        for (const row of (data || [])) {
          const match = pendingCategoriaAdds.find((a) => a.nome === row.nome);
          if (match) tempToReal.set(match.tempId, row.id);
        }
      }
      // Atualizar estado global
      await fetchCategorias();
      // Atualizar categoria selecionada se era temp
      if (formData.categoria_id && tempToReal.has(formData.categoria_id)) {
        setFormData((prev) => ({ ...prev, categoria_id: tempToReal.get(prev.categoria_id)! }));
      }
      setDialogCategorias(categorias);
      setPendingCategoriaAdds([]);
      setPendingCategoriaDeletes([]);
      toast({ title: 'Categorias salvas com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar categorias', description: error.message, variant: 'destructive' });
    } finally {
      setSavingCategoria(false);
    }
  }

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'all' || p.categoria_id === filterCategoria;
    const matchesMarca = filterMarca === 'all' || (p as any).marca_id === filterMarca;
    return matchesSearch && matchesCategoria && matchesMarca;
  });

  const getStockStatus = (quantidade: number, estoqueMinimo: number) => {
    if (quantidade === 0) return { label: 'Sem estoque', variant: 'destructive' as const };
    if (quantidade <= estoqueMinimo) return { label: 'Estoque baixo', variant: 'warning' as const };
    return { label: 'Normal', variant: 'success' as const };
  };

  const handleOpenDialog = async (produto?: Produto) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        codigo: produto.codigo,
        nome: produto.nome,
        categoria_id: produto.categoria_id || '',
        marca_id: (produto as any).marca_id || '',
        quantidade: produto.quantidade,
        estoque_minimo: produto.estoque_minimo,
        localizacao: produto.localizacao || '',
        fornecedor: produto.fornecedor || '',
        descricao: produto.descricao || '',
        valor_compra: produto.valor_compra != null ? String(produto.valor_compra) : '',
      });
      setImagePreview(produto.imagem_url || null);
      const { data: pa } = await supabase
        .from('produto_areas')
        .select('area_id')
        .eq('produto_id', produto.id);
      const ids = (pa || []).map((r: any) => r.area_id as string);
      setProductAreaIds(ids);
      // Derive setor/subsetor
      const setores = areas.filter((a) => a.parent_id === null);
      const linkedSetor = setores.find((s) => ids.includes(s.id));
      if (linkedSetor) {
        setProductSetorId(linkedSetor.id);
        const sub = areas.find((a) => a.parent_id === linkedSetor.id && ids.includes(a.id));
        setProductSubsetorId(sub?.id || '');
      } else {
        const linkedSub = areas.find((a) => a.parent_id !== null && ids.includes(a.id));
        if (linkedSub) {
          setProductSetorId(linkedSub.parent_id!);
          setProductSubsetorId(linkedSub.id);
        } else {
          const geralId = areas.find((a) => a.nome === 'Geral' && a.parent_id === null)?.id || '';
          setProductSetorId(geralId);
          setProductSubsetorId('');
        }
      }
    } else {
      setEditingProduto(null);
      setFormData({
        codigo: '',
        nome: '',
        categoria_id: '',
        marca_id: '',
        quantidade: 0,
        estoque_minimo: 0,
        localizacao: '',
        fornecedor: '',
        descricao: '',
        valor_compra: '',
      });
      setImagePreview(null);
      // Default to Geral
      const geralId = areas.find((a) => a.nome === 'Geral' && a.parent_id === null)?.id || '';
      setProductSetorId(geralId);
      setProductSubsetorId('');
      setProductAreaIds([geralId].filter(Boolean));
    }
    setDialogCategorias([...categorias]);
    setPendingCategoriaAdds([]);
    setPendingCategoriaDeletes([]);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `brindes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('produtos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Salvar alterações pendentes em categorias antes de criar o brinde
      if (!editingProduto && (pendingCategoriaAdds.length > 0 || pendingCategoriaDeletes.length > 0)) {
        await handleSaveCategorias();
      }

      let imagemUrl = editingProduto?.imagem_url || null;

      // Upload nova imagem se selecionada
      if (imageFile) {
        imagemUrl = await uploadImage(imageFile);
      } else if (!imagePreview && editingProduto?.imagem_url) {
        // Imagem foi removida
        imagemUrl = null;
      }

      const submitData = {
        ...formData,
        categoria_id: formData.categoria_id || null,
        marca_id: formData.marca_id || null,
        imagem_url: imagemUrl,
        valor_compra: formData.valor_compra === '' ? null : parseFloat(formData.valor_compra),
      };

      let produtoId = editingProduto?.id;
      if (editingProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(submitData)
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast({ title: 'Brinde atualizado com sucesso!' });
      } else {
        const { data: created, error } = await supabase
          .from('produtos')
          .insert([submitData])
          .select('id')
          .single();

        if (error) throw error;
        produtoId = created?.id;
        toast({ title: 'Brinde adicionado com sucesso!' });
      }

      // Sincronizar áreas vinculadas ao produto
      if (produtoId) {
        await supabase.from('produto_areas').delete().eq('produto_id', produtoId);
        const areaIdsToSave: string[] = [];
        if (productSetorId) areaIdsToSave.push(productSetorId);
        if (productSubsetorId) areaIdsToSave.push(productSubsetorId);
        if (areaIdsToSave.length > 0) {
          await supabase.from('produto_areas').insert(
            areaIdsToSave.map((area_id) => ({ produto_id: produtoId!, area_id }))
          );
        }
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

  const handleOpenRequestDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setRequestQuantidade(1);
    setRequestMotivo('');
    // Auto-preenche com nome do perfil
    const parts = userProfileName.split(' ');
    setRequestNome(parts[0] || '');
    setRequestSobrenome(parts.slice(1).join(' ') || '');
    setRequestFilial('');
    setEntregarOutraPessoa(false);
    setOutraPessoaNome('');
    setOutraPessoaSobrenome('');
    setIsRequestDialogOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto || !user) return;

    if (!requestNome.trim() || !requestSobrenome.trim() || !requestFilial || !requestMotivo.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (entregarOutraPessoa && (!outraPessoaNome.trim() || !outraPessoaSobrenome.trim())) {
      toast({ title: 'Preencha o nome da pessoa que receberá o brinde', variant: 'destructive' });
      return;
    }
    
    setFormLoading(true);
    try {
      let motivoCompleto = `Nome: ${requestNome} ${requestSobrenome} | Filial: ${requestFilial}`;
      if (entregarOutraPessoa) {
        motivoCompleto += ` | Entregar a: ${outraPessoaNome} ${outraPessoaSobrenome}`;
      }
      motivoCompleto += requestMotivo ? ` | Motivo: ${requestMotivo}` : '';
      
      const { error } = await supabase
        .from('pedidos')
        .insert([{
          produto_id: selectedProduto.id,
          quantidade: requestQuantidade,
          solicitante_id: user.id,
          motivo: motivoCompleto,
          status: 'pendente',
          prioridade: isDiretoria ? 'diretoria' : 'normal',
        }]);

      if (error) throw error;
      
      toast({ title: 'Solicitação enviada com sucesso!' });
      setIsRequestDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Brindes</h1>
          <p className="text-muted-foreground mt-1">
            {canManage ? 'Gerencie seu estoque de brindes' : 'Visualize e solicite brindes'}
          </p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Brinde
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingProduto ? 'Editar Brinde' : 'Novo Brinde'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {dialogCategorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdmin && !editingProduto && (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova categoria"
                          value={newCategoriaNome}
                          onChange={(e) => setNewCategoriaNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategoria();
                            }
                          }}
                          className="h-8"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddCategoria}
                          disabled={savingCategoria || !newCategoriaNome.trim()}
                        >
                          {savingCategoria ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                      {dialogCategorias.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {dialogCategorias.map((cat) => (
                            <Badge key={cat.id} variant="secondary" className="gap-1 pr-1">
                              <span>{cat.nome}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategoria(cat.id, cat.nome)}
                                disabled={deletingCategoriaId === cat.id}
                                className="ml-1 rounded-sm hover:bg-destructive/20 p-0.5"
                                aria-label={`Excluir ${cat.nome}`}
                              >
                                {deletingCategoriaId === cat.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(pendingCategoriaAdds.length > 0 || pendingCategoriaDeletes.length > 0) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="w-full"
                          onClick={handleSaveCategorias}
                          disabled={savingCategoria}
                        >
                          {savingCategoria ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Salvar{"\u00a0"}
                        </Button>
                      )}
                    </div>
                  )}
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

              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Select
                  value={formData.marca_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, marca_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem marca</SelectItem>
                    {marcas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && !editingProduto && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nova marca"
                        value={newMarcaNome}
                        onChange={(e) => setNewMarcaNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMarca();
                          }
                        }}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddMarca}
                        disabled={savingMarca || !newMarcaNome.trim()}
                      >
                        {savingMarca ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                    {marcas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {marcas.map((m) => (
                          <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                            <span>{m.nome}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMarca(m.id, m.nome)}
                              className="ml-1 rounded-sm hover:bg-destructive/20 p-0.5"
                              aria-label={`Excluir ${m.nome}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <FornecedorAutocomplete
                  fornecedores={fornecedoresList}
                  mode="text"
                  value={formData.fornecedor}
                  onTextChange={(t) => setFormData({ ...formData, fornecedor: t })}
                  placeholder="Pesquisar ou digitar fornecedor..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_compra">Valor de compra (R$)</Label>
                <Input
                  id="valor_compra"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor_compra}
                  onChange={(e) => setFormData({ ...formData, valor_compra: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Custo unitário do item</p>
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

              <div className="space-y-2">
                <Label>Setor / Subsetor</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione o setor do brinde. "Geral" = visível para todos.
                </p>
                <SetorSubsetorSelector
                  setorId={productSetorId}
                  subsetorId={productSubsetorId}
                  onSetorChange={setProductSetorId}
                  onSubsetorChange={setProductSubsetorId}
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem do Brinde</Label>
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-lg border overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar uma imagem
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG até 5MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
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
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <ProdutoAutocomplete
          produtos={produtos}
          mode="search"
          value={searchTerm}
          onTextChange={setSearchTerm}
          onSelect={(p) => setSearchTerm(p.nome)}
          placeholder="Buscar por nome ou código..."
          className="flex-1"
        />
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
        <Select value={filterMarca} onValueChange={setFilterMarca}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas marcas</SelectItem>
            {marcas.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterCategoria !== 'all' || filterMarca !== 'all' || searchTerm) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setFilterCategoria('all'); setFilterMarca('all'); setSearchTerm(''); }}
          >
            <X className="w-4 h-4 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProdutos.map((produto) => {
          const status = getStockStatus(produto.quantidade, produto.estoque_minimo);
          return (
            <Card key={produto.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {produto.imagem_url ? (
                      <SignedImage
                        bucket="produtos"
                        source={produto.imagem_url}
                        alt={produto.nome}
                        className="w-full h-full object-cover"
                        fallback={<Gift className="w-6 h-6 text-muted-foreground" />}
                      />
                    ) : (
                      <Gift className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold truncate">{produto.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">{produto.codigo}</p>
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
                  {canManage && produto.valor_compra != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor compra</span>
                      <span className="font-medium">
                        {Number(produto.valor_compra).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  )}
                </div>

                {canManage ? (
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
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDelete(produto.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gradient-primary hover:opacity-90"
                      onClick={() => handleOpenRequestDialog(produto)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Solicitar
                    </Button>
                  </div>
                )}
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

      {/* Dialog de Solicitação */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Solicitar Brinde</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <form onSubmit={handleSubmitRequest} className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center overflow-hidden">
                  {selectedProduto.imagem_url ? (
                    <SignedImage
                      bucket="produtos"
                      source={selectedProduto.imagem_url}
                      alt={selectedProduto.nome}
                      className="w-full h-full object-cover"
                      fallback={<Gift className="w-5 h-5 text-muted-foreground" />}
                    />
                  ) : (
                    <Gift className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedProduto.nome}</p>
                  <p className="text-sm text-muted-foreground">Disponível: {selectedProduto.quantidade}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="request-nome">Nome <span className="text-destructive">*</span></Label>
                  <Input
                    id="request-nome"
                    value={requestNome}
                    onChange={(e) => setRequestNome(e.target.value)}
                    readOnly={!!userProfileName}
                    className={userProfileName ? 'bg-muted' : ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-sobrenome">Sobrenome <span className="text-destructive">*</span></Label>
                  <Input
                    id="request-sobrenome"
                    value={requestSobrenome}
                    onChange={(e) => setRequestSobrenome(e.target.value)}
                    readOnly={!!userProfileName}
                    className={userProfileName ? 'bg-muted' : ''}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="entregar-outra-pessoa"
                  checked={entregarOutraPessoa}
                  onCheckedChange={(checked) => setEntregarOutraPessoa(checked === true)}
                />
                <Label htmlFor="entregar-outra-pessoa" className="text-sm font-normal cursor-pointer">
                  Entregar a outra pessoa
                </Label>
              </div>

              {entregarOutraPessoa && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label htmlFor="outra-nome">Nome do destinatário <span className="text-destructive">*</span></Label>
                    <Input
                      id="outra-nome"
                      placeholder="Nome"
                      value={outraPessoaNome}
                      onChange={(e) => setOutraPessoaNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outra-sobrenome">Sobrenome <span className="text-destructive">*</span></Label>
                    <Input
                      id="outra-sobrenome"
                      placeholder="Sobrenome"
                      value={outraPessoaSobrenome}
                      onChange={(e) => setOutraPessoaSobrenome(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="request-filial">Filial <span className="text-destructive">*</span></Label>
                <Select value={requestFilial} onValueChange={setRequestFilial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gotemburgo Salvador">Gotemburgo Salvador</SelectItem>
                    <SelectItem value="Gotemburgo Feira de Santana">Gotemburgo Feira de Santana</SelectItem>
                    <SelectItem value="Gotemburgo Juazeiro">Gotemburgo Juazeiro</SelectItem>
                    <SelectItem value="Gotemburgo Lem">Gotemburgo Lem</SelectItem>
                    <SelectItem value="Gotemburgo Aracaju">Gotemburgo Aracaju</SelectItem>
                    <SelectItem value="Gotemburgo Recife">Gotemburgo Recife</SelectItem>
                    <SelectItem value="Gotemburgo Maceió">Gotemburgo Maceió</SelectItem>
                    <SelectItem value="Gotemburgo Queimadas">Gotemburgo Queimadas</SelectItem>
                    <SelectItem value="Gotemburgo Natal">Gotemburgo Natal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-quantidade">Quantidade</Label>
                <Input
                  id="request-quantidade"
                  type="number"
                  min="1"
                  max={selectedProduto.quantidade}
                  value={requestQuantidade}
                  onChange={(e) => setRequestQuantidade(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-motivo">Motivo <span className="text-destructive">*</span></Label>
                <Textarea
                  id="request-motivo"
                  placeholder="Ex: Evento de marketing, brinde para cliente..."
                  value={requestMotivo}
                  onChange={(e) => setRequestMotivo(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading || !requestNome.trim() || !requestSobrenome.trim() || !requestFilial || !requestMotivo.trim() || (entregarOutraPessoa && (!outraPessoaNome.trim() || !outraPessoaSobrenome.trim()))} className="gradient-primary">
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar Solicitação
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
