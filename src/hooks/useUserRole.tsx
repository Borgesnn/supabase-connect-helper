import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppRole } from '@/types/database';

interface UseUserRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isOperario: boolean;
  isUsuario: boolean;
  canManage: boolean; // admin ou operário
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('usuario'); // Default fallback
        } else {
          setRole(data?.role as AppRole || 'usuario');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('usuario');
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isOperario = role === 'operario';
  const isUsuario = role === 'usuario';
  const canManage = isAdmin || isOperario;

  return {
    role,
    loading,
    isAdmin,
    isOperario,
    isUsuario,
    canManage,
  };
}
