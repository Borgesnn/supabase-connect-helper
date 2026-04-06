import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lightbulb, Plus, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Sugestao {
  id: string;
  nome: string;
  imagem_url: string | null;
  link: string | null;
  usuario_id: string;
  created_at: string;
  profile?: { nome: string };
}

export default function Sugestoes() {
  const { user } = useAuth();
  const { isAdmin, canManage } = useUserRole();
  const { toast } = useToast();
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [nome, setNome] = useState('');
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const fetchSugestoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sugestoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for admin/operario
      if (canManage && data && data.length > 0) {
        const userIds = [...new Set(data.map((s: any) => s.usuario_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p.nome]) || []);
        const enriched = data.map((s: any) => ({
          ...s,
          profile: { nome: profileMap.get(s.usuario_id) || 'Usuário' },
        }));
        setSugestoes(enriched);
      } else {
        setSugestoes(data || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSugestoes();
  }, [canManage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImagemFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagemPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagemPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ title: 'Erro', description: 'O nome do brinde é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;

      if (imagemFile) {
        const fileExt = imagemFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('sugestoes')
          .upload(filePath, imagemFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('sugestoes')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('sugestoes').insert({
        nome: nome.trim(),
        imagem_url: imageUrl,
        link: link.trim() || null,
        usuario_id: user.id,
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Sugestão enviada com sucesso!' });
      setNome('');
      setImagemFile(null);
      setImagemPreview(null);
      setLink('');
      setDialogOpen(false);
      fetchSugestoes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('sugestoes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Sugestão excluída.' });
      fetchSugestoes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões de Brindes</h1>
          <p className="text-muted-foreground">
            {canManage
              ? 'Veja as sugestões de brindes dos usuários'
              : 'Sugira novos brindes que você gostaria de ver disponíveis'}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Sugestão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sugerir um Brinde</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="sug-nome">
                  Nome do Brinde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sug-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Camiseta Personalizada"
                />
              </div>
              <div>
                <Label htmlFor="sug-imagem">Imagem do Brinde</Label>
                <Input
                  id="sug-imagem"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {imagemPreview && (
                  <img
                    src={imagemPreview}
                    alt="Pré-visualização"
                    className="mt-2 h-32 w-full object-cover rounded-md border"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="sug-link">Link do Brinde</Label>
                <Input
                  id="sug-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://loja.com/produto"
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enviar Sugestão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sugestoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">Nenhuma sugestão ainda</h3>
            <p className="text-muted-foreground mt-1">
              {canManage
                ? 'Os usuários ainda não enviaram sugestões.'
                : 'Seja o primeiro a sugerir um brinde!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sugestoes.map((sug) => (
            <Card key={sug.id} className="overflow-hidden relative group">
              {isAdmin && (
                <button
                  onClick={() => handleDelete(sug.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {sug.imagem_url && (
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={sug.imagem_url}
                    alt={sug.nome}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-foreground">{sug.nome}</h3>

                {canManage && sug.profile && (
                  <p className="text-xs text-muted-foreground">
                    Sugerido por: {sug.profile.nome}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  {new Date(sug.created_at).toLocaleDateString('pt-BR')}
                </p>

                {sug.link && (
                  <a
                    href={sug.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver brinde
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
