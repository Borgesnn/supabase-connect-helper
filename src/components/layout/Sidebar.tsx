import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { 
  Gift, 
  LayoutDashboard, 
  ShoppingCart, 
  ArrowLeftRight, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: ('admin' | 'operario' | 'usuario')[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, requiredRoles: ['admin', 'operario'] },
  { path: '/brindes', label: 'Brindes', icon: Gift },
  { path: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, requiredRoles: ['admin', 'operario'] },
  { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { path: '/usuarios', label: 'Usuários', icon: Users, requiredRoles: ['admin', 'operario'] },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const { signOut } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Filtra itens de navegação baseado no papel do usuário
  const filteredNavItems = navItems.filter(item => {
    if (!item.requiredRoles) return true;
    if (!role) return false;
    return item.requiredRoles.includes(role);
  });

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar flex flex-col transition-all duration-300 relative",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-accent-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground">
            Gotemburgo
          </span>
        )}
      </div>

      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border shadow-md hover:bg-muted"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
                collapsed && "justify-center"
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200",
            "text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
