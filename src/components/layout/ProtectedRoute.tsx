import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'operario' | 'usuario')[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  // Aguardar carregamento
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está logado, redirecionar para auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não há restrição de papel, permitir acesso
  if (!requiredRoles || requiredRoles.length === 0) {
    return <>{children}</>;
  }

  // Verificar se o usuário tem um dos papéis permitidos
  if (role && requiredRoles.includes(role)) {
    return <>{children}</>;
  }

  // Redirecionar para a página de brindes (que todos podem acessar)
  return <Navigate to="/brindes" replace />;
}
