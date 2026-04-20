import { NavLink, useNavigate } from 'react-router-dom';
import gotLogo from '@/assets/got.png';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { 
  Package, 
  LayoutDashboard, 
  ShoppingCart, 
  ArrowLeftRight, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Truck,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: ('admin' | 'operario' | 'usuario')[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, requiredRoles: ['admin', 'operario'] },
  { path: '/brindes', label: 'Brindes', icon: Package },
  { path: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, requiredRoles: ['admin', 'operario'] },
  { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { path: '/sugestoes', label: 'Sugestões', icon: Lightbulb },
  { path: '/usuarios', label: 'Usuários', icon: Users, requiredRoles: ['admin', 'operario'] },
  { path: '/fornecedores', label: 'Fornecedores', icon: Truck, requiredRoles: ['admin', 'operario'] },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileToggle }: SidebarProps) {
  const { signOut } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.requiredRoles) return true;
    if (!role) return false;
    return item.requiredRoles.includes(role);
  });

  const handleNavClick = () => {
    if (mobileOpen) onMobileToggle();
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar flex items-center px-4 z-50 border-b border-sidebar-border">
        <Button variant="ghost" size="icon" onClick={onMobileToggle} className="text-sidebar-foreground">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src={gotLogo} alt="GOT Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-base font-semibold text-sidebar-foreground">Gotemburgo</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
          // Desktop
          "hidden md:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={gotLogo} alt="GOT Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">Gotemburgo</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border shadow-md hover:bg-muted z-50"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>

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

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar flex flex-col transition-transform duration-300 z-50 w-64",
          "md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={gotLogo} alt="GOT Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">Gotemburgo</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onMobileToggle} className="text-sidebar-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full transition-all duration-200 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
