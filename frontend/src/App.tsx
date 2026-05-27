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
import AccountsPage from './pages/AccountsPage'   // ← nuevo

// ── Guards de ruta ────────────────────────────────────────────────────────────

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// Solo supervisor — acceso global sin restricciones
function SupervisorRoute({ children }: { children: React.ReactNode }) {
  const { isSupervisor } = useAuthStore()
  return isSupervisor() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

// Supervisor + Administrador — gestión de edificio
function ManageRoute({ children }: { children: React.ReactNode }) {
  const { canManageBuilding } = useAuthStore()
  return canManageBuilding() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

// Supervisor + Administrador + Gestión — operaciones diarias
function OperateRoute({ children }: { children: React.ReactNode }) {
  const { canOperate } = useAuthStore()
  return canOperate() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

// Dashboard inteligente por rol
function SmartDashboard() {
  const { isPropietario } = useAuthStore()
  return isPropietario() ? <PropietarioDashboard /> : <DashboardPage />
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:  'var(--bg-elevated)',
            color:       'var(--text-primary)',
            border:      '1px solid var(--border)',
            fontSize:    '0.875rem',
            fontFamily:  'var(--font-body)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg-elevated)' } },
        }}
      />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Rutas privadas con layout */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard — diferente por rol */}
          <Route path="dashboard" element={<SmartDashboard />} />

          {/* ── Solo supervisor (global) ── */}
          <Route path="accounts" element={<SupervisorRoute><AccountsPage /></SupervisorRoute>} />

          {/* ── Supervisor + Administrador ── */}
          <Route path="receipts"     element={<ManageRoute><ReceiptsPage /></ManageRoute>} />
          <Route path="buildings"    element={<ManageRoute><BuildingsPage /></ManageRoute>} />
          <Route path="services"     element={<ManageRoute><ServicesPage /></ManageRoute>} />
          <Route path="notificaciones" element={<ManageRoute><NotificacionesPage /></ManageRoute>} />
          <Route path="users"        element={<ManageRoute><UsersPage /></ManageRoute>} />
          <Route path="owners"       element={<ManageRoute><OwnersPage /></ManageRoute>} />
          <Route path="owners/new"    element={<ManageRoute><OwnerFormPage /></ManageRoute>} />
          <Route path="owners/:id/edit" element={<ManageRoute><OwnerFormPage /></ManageRoute>} />

          {/* ── Supervisor + Administrador + Gestión ── */}
          <Route path="readings/new" element={<OperateRoute><NewReadingPage /></OperateRoute>} />
          <Route path="cobros"       element={<OperateRoute><CobrosPage /></OperateRoute>} />
          <Route path="gastos"       element={<OperateRoute><GastosPage /></OperateRoute>} />
          <Route path="pagos"        element={<OperateRoute><PagosPage /></OperateRoute>} />
          <Route path="mediciones"   element={<OperateRoute><MedicionesPage /></OperateRoute>} />
          <Route path="areas"        element={<OperateRoute><AreasPage /></OperateRoute>} />

          {/* ── Propietario ── */}
          <Route path="mis-pagos" element={<PrivateRoute><PropietarioPagosPage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
