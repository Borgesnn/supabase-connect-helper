import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Brindes from "./pages/Brindes";
import Movimentacoes from "./pages/Movimentacoes";
import Pedidos from "./pages/Pedidos";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Sugestoes from "./pages/Sugestoes";
import Fornecedores from "./pages/Fornecedores";
import Cotacoes from "./pages/Cotacoes";
import ImportarExportar from "./pages/ImportarExportar";
import CatalogoMateriais from "./pages/materiais/CatalogoMateriais";
import SolicitacoesArtes from "./pages/materiais/SolicitacoesArtes";
import EmprestimosMateriais from "./pages/materiais/EmprestimosMateriais";
import HistoricoMateriais from "./pages/materiais/HistoricoMateriais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Dashboard - apenas admin e operário */}
            <Route path="/" element={
              <ProtectedRoute requiredRoles={['admin', 'operario']}>
                <MainLayout><Dashboard /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Brindes - todos podem ver */}
            <Route path="/brindes" element={
              <ProtectedRoute>
                <MainLayout><Brindes /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Movimentações - apenas admin e operário */}
            <Route path="/movimentacoes" element={
              <ProtectedRoute requiredRoles={['admin', 'operario']}>
                <MainLayout><Movimentacoes /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Pedidos - todos podem ver */}
            <Route path="/pedidos" element={
              <ProtectedRoute>
                <MainLayout><Pedidos /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Usuários - apenas admin e operário podem ver */}
            <Route path="/usuarios" element={
              <ProtectedRoute requiredRoles={['admin', 'operario']}>
                <MainLayout><Usuarios /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Sugestões - todos podem acessar */}
            <Route path="/sugestoes" element={
              <ProtectedRoute>
                <MainLayout><Sugestoes /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Fornecedores - apenas admin e operário */}
            <Route path="/fornecedores" element={
              <ProtectedRoute requiredRoles={['admin', 'operario']}>
                <MainLayout><Fornecedores /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Cotações - todos veem, admin/operário gerencia */}
            <Route path="/cotacoes" element={
              <ProtectedRoute>
                <MainLayout><Cotacoes /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Importar/Exportar - apenas admin e operário */}
            <Route path="/importar-exportar" element={
              <ProtectedRoute requiredRoles={['admin', 'operario']}>
                <MainLayout><ImportarExportar /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Materiais Visuais */}
            <Route path="/materiais-visuais/catalogo" element={
              <ProtectedRoute>
                <MainLayout><CatalogoMateriais /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/materiais-visuais/artes" element={
              <ProtectedRoute>
                <MainLayout><SolicitacoesArtes /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/materiais-visuais/emprestimos" element={
              <ProtectedRoute>
                <MainLayout><EmprestimosMateriais /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/materiais-visuais/historico" element={
              <ProtectedRoute>
                <MainLayout><HistoricoMateriais /></MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Configurações - todos podem acessar */}
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <MainLayout><Configuracoes /></MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
