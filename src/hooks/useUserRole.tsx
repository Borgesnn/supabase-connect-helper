import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppRole } from '@/types/database';

interface UseUserRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isUsuario: boolean;
  canManage: boolean; // admin ou editor
}

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    async function fetchRole() {
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!userId) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('usuario'); // Default fallback
        } else {
          setRole(data?.role as AppRole || 'usuario');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching user role:', error);
        setRole('usuario');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

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
