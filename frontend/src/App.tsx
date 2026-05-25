import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth.store'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BuildingsPage from './pages/BuildingsPage'
import OwnersPage from './pages/OwnersPage'
import OwnerFormPage from './pages/OwnerFormPage'
import AreasPage from './pages/AreasPage'
import NewReadingPage from './pages/NewReadingPage'
import ReceiptsPage from './pages/ReceiptsPage'
import CobrosPage from './pages/CobrosPage'
import PagosPage from './pages/PagosPage'
import ServicesPage from './pages/ServicesPage'
import NotificacionesPage from './pages/NotificacionesPage'
import GastosPage from './pages/GastosPage'
import MedicionesPage from './pages/MedicionesPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import UsersPage from './pages/UsersPage'
import PropietarioDashboard from './pages/PropietarioDashboard'
import PropietarioPagosPage from './pages/PropietarioPagosPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function SupervisorRoute({ children }: { children: React.ReactNode }) {
  const { isSupervisor } = useAuthStore()
  return isSupervisor() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

// Dashboard inteligente: muestra distinto según el rol
function SmartDashboard() {
  const { isSupervisor } = useAuthStore()
  return isSupervisor() ? <DashboardPage /> : <PropietarioDashboard />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg-elevated)' } },
        }}
      />
      <Routes>
        {/* Ruta pública — sin layout ni autenticación */}
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Rutas privadas — con layout */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard — diferente por rol */}
          <Route path="dashboard" element={<SmartDashboard />} />

          {/* ── Solo supervisor ── */}
          <Route path="receipts"     element={<SupervisorRoute><ReceiptsPage /></SupervisorRoute>} />
          <Route path="readings/new" element={<SupervisorRoute><NewReadingPage /></SupervisorRoute>} />
          <Route path="buildings"    element={<SupervisorRoute><BuildingsPage /></SupervisorRoute>} />
          <Route path="cobros"       element={<SupervisorRoute><CobrosPage /></SupervisorRoute>} />
          <Route path="notificaciones" element={<SupervisorRoute><NotificacionesPage /></SupervisorRoute>} />
          <Route path="services"     element={<SupervisorRoute><ServicesPage /></SupervisorRoute>} />
          <Route path="pagos"        element={<SupervisorRoute><PagosPage /></SupervisorRoute>} />
          <Route path="areas"        element={<SupervisorRoute><AreasPage /></SupervisorRoute>} />
          <Route path="mediciones"   element={<SupervisorRoute><MedicionesPage /></SupervisorRoute>} />
          <Route path="owners"       element={<SupervisorRoute><OwnersPage /></SupervisorRoute>} />
          <Route path="owners/new"    element={<SupervisorRoute><OwnerFormPage /></SupervisorRoute>} />
          <Route path="owners/:id/edit" element={<SupervisorRoute><OwnerFormPage /></SupervisorRoute>} />
          <Route path="gastos"       element={<SupervisorRoute><GastosPage /></SupervisorRoute>} />
          <Route path="users"        element={<SupervisorRoute><UsersPage /></SupervisorRoute>} />

          {/* ── Propietario ── */}
          <Route path="mis-pagos"    element={<PrivateRoute><PropietarioPagosPage /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
