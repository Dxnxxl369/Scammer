import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'
import { Login } from './pages/Login'
import { Registro } from './pages/Registro'
import { Planes } from './pages/Planes'
import { AnalysisCenter } from './pages/AnalysisCenter'
import { Perfil } from './pages/Perfil'
import { Historial } from './pages/Historial'
import { Borradores } from './pages/Borradores'
import { Reportes } from './pages/Reportes'
import { RecuperarPassword } from './pages/RecuperarPassword'
import HealthCheck from './pages/HealthCheck'
import { DesignSystem } from './pages/DesignSystem'
import { Prueba } from './pages/Prueba'
import { Home } from './pages/Home'
import { AdminRoute } from './routes/AdminRoute'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsuarios } from './pages/admin/AdminUsuarios'
import { AdminBitacora } from './pages/admin/AdminBitacora'
import { AdminReportes } from './pages/admin/AdminReportes'
import { AdminNotificacionesConfig } from './pages/admin/AdminNotificacionesConfig'
import { AdminPlanes } from './pages/admin/AdminPlanes'
import { Loader2 } from 'lucide-react'

const queryClient = new QueryClient()

function AppContent() {
  const { cargando, inicializado } = useAuth()

  // Pantalla de bloqueo SOLO si no estamos inicializados
  if (cargando && !inicializado) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center">
        <Loader2 className="w-16 h-16 text-[#ff0055] animate-spin mb-6" />
        <p className="text-[#ff0055] text-[10px] font-black tracking-[0.6em] uppercase animate-pulse text-center">
          Sincronizando Terminal...<br/>
          <span className="opacity-40 text-[8px]">Verificando Credenciales Forenses</span>
        </p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/health" element={<HealthCheck />} />
      <Route path="/design-system" element={<DesignSystem />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/registro" element={<PublicOnlyRoute><Registro /></PublicOnlyRoute>} />
      <Route path="/planes" element={<Planes />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><AnalysisCenter /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
      <Route path="/historial" element={<ProtectedRoute><Historial /></ProtectedRoute>} />
      <Route path="/borradores" element={<ProtectedRoute><Borradores /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
      <Route path="/prueba" element={<Prueba />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
      <Route path="/admin/bitacora" element={<AdminRoute><AdminBitacora /></AdminRoute>} />
      <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />
      <Route path="/admin/notificaciones" element={<AdminRoute><AdminNotificacionesConfig /></AdminRoute>} />
      <Route path="/admin/planes" element={<AdminRoute><AdminPlanes /></AdminRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
