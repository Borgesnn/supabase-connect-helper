import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Shield, Loader2, Lock, UserPlus, Eye, EyeOff, X, Pencil } from 'lucide-react';

interface UserProfile {
  id: string;
  nome: string;
  sobrenome: string | null;
  cargo: string | null;
  created_at: string;
  role?: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operario: 'Operário',
  usuario: 'Usuário',
};

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  operario: 'bg-accent text-accent-foreground',
  usuario: 'bg-muted text-muted-foreground',
};

export default function Usuarios() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  // Estado para cadastro de usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserSobrenome, setNewUserSobrenome] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'usuario' | 'operario' | 'admin'>('usuario');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Estado para edição de usuário
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [user]);

  async function fetchUsers() {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role || 'usuario',
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    try {
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as 'admin' | 'operario' | 'usuario' })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole as 'admin' | 'operario' | 'usuario' }]);
        if (error) throw error;
      }

      toast({ title: 'Papel atualizado com sucesso!' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro ao atualizar papel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  }

  async function handleCreateUser() {
    if (!newUserName || !newUserSobrenome || !newUserEmail || !newUserPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (newUserPassword.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: { data: { nome: newUserName, sobrenome: newUserSobrenome } },
      });

      if (error) throw error;

      if (data.user && newUserRole !== 'usuario') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: newUserRole })
          .eq('user_id', data.user.id);
        if (roleError) console.error('Error updating role:', roleError);
      }

      toast({
        title: 'Usuário criado com sucesso!',
        description: `${newUserName} ${newUserSobrenome} foi cadastrado como ${roleLabels[newUserRole]}`,
      });

      setNewUserName('');
      setNewUserSobrenome('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('usuario');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return;
    setDeletingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: deleteUserId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: 'Usuário excluído com sucesso!' });
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingUser(false);
    }
  }

  function openEditDialog(u: UserProfile) {
    setEditUser(u);
    setEditNome(u.nome || '');
    setEditSobrenome(u.sobrenome || '');
    setEditCargo(u.cargo || '');
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: editNome, sobrenome: editSobrenome, cargo: editCargo || null })
        .eq('id', editUser.id);
      if (error) throw error;
      toast({ title: 'Usuário atualizado com sucesso!' });
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  }

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
        <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground mt-1">Gerencie os usuários e seus papéis</p>
      </div>

      {/* Cadastro de novo usuário - apenas admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Cadastrar Novo Usuário</CardTitle>
                <CardDescription>Adicione um novo usuário ao sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input
                  value={newUserSobrenome}
                  onChange={(e) => setNewUserSobrenome(e.target.value)}
                  placeholder="Sobrenome"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    type={showNewUserPassword ? 'text' : 'password'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  >
                    {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="operario">Operário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="w-full"
                >
                  {creatingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {users.map((u) => {
          const initials = `${u.nome?.[0] || ''}${u.sobrenome?.[0] || ''}`.toUpperCase() || 'U';
          return (
            <Card
              key={u.id}
              className="group relative flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-border/60"
            >
              {isAdmin && u.id !== user?.id && (
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditDialog(u)}
                    className="p-1.5 rounded-md bg-background/80 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar usuário"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteUserId(u.id)}
                    className="p-1.5 rounded-md bg-background/80 border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir usuário"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <CardTitle className="text-sm font-semibold truncate">
                      {u.nome}{u.sobrenome ? ` ${u.sobrenome}` : ''}
                    </CardTitle>
                    {u.cargo ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.cargo}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic mt-0.5">Sem cargo</p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Papel</span>
                  <Badge className={`${roleBadgeStyles[u.role || 'usuario']} text-xs`}>
                    {roleLabels[u.role || 'usuario']}
                  </Badge>
                </div>

                {isAdmin ? (
                  <Select
                    value={u.role}
                    onValueChange={(value) => handleRoleChange(u.id, value)}
                    disabled={updating === u.id}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuário</SelectItem>
                      <SelectItem value="operario">Operário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>Somente admin altera</span>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground pt-2 border-t mt-auto">
                  Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhum usuário encontrado</h3>
          <p className="text-muted-foreground">Os usuários aparecerão aqui após se registrarem</p>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir este usuário?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleDeleteUser} disabled={deletingUser}>
              {deletingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sim
            </Button>
            <Button variant="destructive" onClick={() => setDeleteUserId(null)} disabled={deletingUser}>
              Não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição de usuário */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome" />
            </div>
            <div className="space-y-2">
              <Label>Sobrenome</Label>
              <Input value={editSobrenome} onChange={(e) => setEditSobrenome(e.target.value)} placeholder="Sobrenome" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={editCargo} onChange={(e) => setEditCargo(e.target.value)} placeholder="Cargo" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="destructive" onClick={() => setEditUser(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
