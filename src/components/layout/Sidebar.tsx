import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
  FileSpreadsheet,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Role = 'admin' | 'operario' | 'usuario';

interface NavLeaf {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: Role[];
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup =>
  (entry as NavGroup).children !== undefined;

const navItems: NavEntry[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, requiredRoles: ['admin', 'operario'] },
  {
    key: 'brindes',
    label: 'Brindes',
    icon: Package,
    children: [
      { path: '/brindes', label: 'Catálogo de Brindes', icon: Package },
      { path: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, requiredRoles: ['admin', 'operario'] },
      { path: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
      { path: '/sugestoes', label: 'Sugestões', icon: Lightbulb },
    ],
  },
  { path: '/usuarios', label: 'Usuários', icon: Users, requiredRoles: ['admin', 'operario'] },
  { path: '/fornecedores', label: 'Fornecedores', icon: Truck, requiredRoles: ['admin', 'operario'] },
  { path: '/cotacoes', label: 'Cotações', icon: FileText },
  { path: '/importar-exportar', label: 'Importar / Exportar', icon: FileSpreadsheet, requiredRoles: ['admin', 'operario'] },
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
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const canSee = (req?: Role[]) => {
    if (!req) return true;
    if (!role) return false;
    return req.includes(role);
  };

  const filteredNavItems: NavEntry[] = navItems
    .map((item) => {
      if (isGroup(item)) {
        const children = item.children.filter((c) => canSee(c.requiredRoles));
        return children.length ? { ...item, children } : null;
      }
      return canSee(item.requiredRoles) ? item : null;
    })
    .filter((x): x is NavEntry => x !== null);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar:openGroups');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Auto-open the group containing the current route (without forcing it closed otherwise)
  useEffect(() => {
    const activeGroup = filteredNavItems.find(
      (item) => isGroup(item) && item.children.some((c) => c.path === location.pathname)
    ) as NavGroup | undefined;
    if (activeGroup && !openGroups[activeGroup.key]) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar:openGroups', JSON.stringify(openGroups));
    } catch {}
  }, [openGroups]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleNavClick = () => {
    if (mobileOpen) onMobileToggle();
  };

  const renderDesktopEntries = () =>
    filteredNavItems.map((item) => {
      if (!isGroup(item)) {
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-primary font-medium',
                collapsed && 'justify-center'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        );
      }

      const isOpen = !!openGroups[item.key];
      const hasActiveChild = item.children.some((c) => c.path === location.pathname);

      // When collapsed, clicking the group expands the sidebar and opens it.
      if (collapsed) {
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onToggle();
              setOpenGroups((prev) => ({ ...prev, [item.key]: true }));
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 justify-center',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              hasActiveChild && 'bg-sidebar-accent text-sidebar-primary font-medium'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
          </button>
        );
      }

      return (
        <div key={item.key}>
          <button
            type="button"
            onClick={() => toggleGroup(item.key)}
            aria-expanded={isOpen}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              hasActiveChild && 'text-sidebar-primary font-medium'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-200 ease-out',
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive && 'bg-sidebar-accent text-sidebar-primary font-medium'
                      )
                    }
                  >
                    <child.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{child.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    });

  const renderMobileEntries = () =>
    filteredNavItems.map((item) => {
      if (!isGroup(item)) {
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-primary font-medium'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      }

      const isOpen = !!openGroups[item.key];
      const hasActiveChild = item.children.some((c) => c.path === location.pathname);

      return (
        <div key={item.key}>
          <button
            type="button"
            onClick={() => toggleGroup(item.key)}
            aria-expanded={isOpen}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg w-full transition-all duration-200',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              hasActiveChild && 'text-sidebar-primary font-medium'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-200 ease-out',
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm',
                        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive && 'bg-sidebar-accent text-sidebar-primary font-medium'
                      )
                    }
                  >
                    <child.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{child.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    });

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
          {renderDesktopEntries()}
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
          {renderMobileEntries()}
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
