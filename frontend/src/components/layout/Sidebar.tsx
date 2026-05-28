import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useTimezoneStore } from '../../store/timezone.store'
import {
  Building2, Users, Droplets, BarChart3, LogOut, ChevronLeft,
  Menu, Home, Shield, Receipt, CreditCard, Settings, Bell,
  Gauge, Wallet, ChevronDown, ChevronRight as ChevronRightIcon,
  Globe, Layers,
} from 'lucide-react'
import { APP_NAME } from '../../config/brand'
import PushNotificationToggle from '../common/PushNotificationToggle'

// ── Tipos ────────────────────────────────────────────────────────────────────
type AllowedRole = 'supervisor' | 'administrador' | 'gestion' | 'propietario'

interface NavItem {
  to:           string
  icon:         React.ReactNode
  label:        string
  allowedRoles: AllowedRole[]
}

interface NavGroup {
  label:        string
  allowedRoles: AllowedRole[]  // quién ve el grupo completo
  items:        NavItem[]
}

// ── Definición de navegación ─────────────────────────────────────────────────
// allowedRoles = roles que pueden ver el item/grupo
// Un rol más alto siempre puede ver lo de roles menores (se resuelve en código)

const ALL_ROLES: AllowedRole[]    = ['supervisor', 'administrador', 'gestion', 'propietario']
const NO_PROPIETARIO: AllowedRole[] = ['supervisor', 'administrador', 'gestion']
const MANAGE_ONLY: AllowedRole[]    = ['supervisor', 'administrador']
const SUPERVISOR_ONLY: AllowedRole[] = ['supervisor']

const NAV_GROUPS: NavGroup[] = [
  {
    label:        '',
    allowedRoles: ALL_ROLES,
    items: [
      { to: '/dashboard', icon: <Home size={16} />, label: 'Dashboard', allowedRoles: ALL_ROLES },
    ],
  },
  {
    label:        'Mi cuenta',
    allowedRoles: ['propietario'],
    items: [
      { to: '/mis-pagos', icon: <CreditCard size={16} />, label: 'Mis Pagos', allowedRoles: ['propietario'] },
    ],
  },
  {
    label:        'Gestión Edificio',
    allowedRoles: NO_PROPIETARIO,
    items: [
      { to: '/receipts',     icon: <Receipt   size={16} />, label: 'Registrar Recibos', allowedRoles: MANAGE_ONLY },
      { to: '/readings/new', icon: <Droplets  size={16} />, label: 'Nueva Medición',    allowedRoles: NO_PROPIETARIO },
      { to: '/cobros',       icon: <BarChart3 size={16} />, label: 'Realizar Cobros',   allowedRoles: NO_PROPIETARIO },
      { to: '/gastos',       icon: <Wallet    size={16} />, label: 'Gastos Generales',  allowedRoles: NO_PROPIETARIO },
    ],
  },
  {
    label:        'Historial',
    allowedRoles: ALL_ROLES,
    items: [
      { to: '/pagos',      icon: <CreditCard size={16} />, label: 'Historial de Pagos',      allowedRoles: NO_PROPIETARIO },
      { to: '/mediciones', icon: <Gauge      size={16} />, label: 'Historial de Mediciones', allowedRoles: NO_PROPIETARIO },
    ],
  },
  {
    label:        'Configuración',
    allowedRoles: MANAGE_ONLY,
    items: [
      { to: '/buildings',      icon: <Building2 size={16} />, label: 'Edificios',      allowedRoles: MANAGE_ONLY },
      { to: '/services',       icon: <Settings  size={16} />, label: 'Servicios',      allowedRoles: MANAGE_ONLY },
      { to: '/notificaciones', icon: <Bell      size={16} />, label: 'Notificaciones', allowedRoles: MANAGE_ONLY },
      { to: '/users',          icon: <Shield    size={16} />, label: 'Usuarios',       allowedRoles: MANAGE_ONLY },
      { to: '/owners',         icon: <Users     size={16} />, label: 'Propietarios',   allowedRoles: MANAGE_ONLY },
    ],
  },
  {
    label:        'Administración',
    allowedRoles: SUPERVISOR_ONLY,
    items: [
      { to: '/accounts', icon: <Layers size={16} />, label: 'Suscripciones', allowedRoles: SUPERVISOR_ONLY },
      { to: '/grupos', icon: <Layers size={16} />, label: 'Grupos', allowedRoles: SUPERVISOR_ONLY },
    ],
  },
]

// ── Colores de rol ────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  supervisor:    { label: 'Supervisor',    color: 'var(--accent)' },
  administrador: { label: 'Administrador', color: 'var(--blue)' },
  gestion:       { label: 'Gestión',       color: '#a78bfa' },
  propietario:   { label: 'Propietario',   color: 'var(--green)' },
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout, isSupervisor, canManageBuilding, canOperate, isPropietario } = useAuthStore()
  const { pais, setPais, paises, loadPaises } = useTimezoneStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed]   = useState(false)
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({
    'Gestión Edificio': true,
    'Historial':        true,
    'Configuración':    false,
    'Mi cuenta':        true,
    'Administración':   false,
  })
  const [showTzPicker, setShowTzPicker] = useState(false)

  useEffect(() => { loadPaises() }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const toggleGroup  = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  const role = (user?.role ?? 'propietario') as AllowedRole

  // Filtrar grupos e items según el rol actual
  const visibleGroups = NAV_GROUPS
    .filter(g => g.allowedRoles.includes(role))
    .map(g => ({
      ...g,
      items: g.items.filter(i => i.allowedRoles.includes(role)),
    }))
    .filter(g => g.items.length > 0)

  const roleInfo = ROLE_CONFIG[role] || ROLE_CONFIG.propietario

  return (
    <aside style={{ ...s.sidebar, width: collapsed ? 60 : 240 }}>

      {/* Header */}
      <div style={s.header}>
        {!collapsed && (
          <div style={s.brand}>
            <div style={s.brandIcon}><Building2 size={15} color="var(--accent)" /></div>
            <span style={s.brandName}>{APP_NAME}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>
          {collapsed
            ? <Menu size={15} color="var(--text-secondary)" />
            : <ChevronLeft size={15} color="var(--text-secondary)" />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div style={s.roleBadge}>
          <Shield size={11} color={roleInfo.color} />
          <span style={{ color: roleInfo.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
            {roleInfo.label}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={s.nav}>
        {visibleGroups.map(group => (
          <div key={group.label || '__root'} style={{ marginBottom: group.label ? '0.25rem' : 0 }}>
            {group.label && !collapsed && (
              <button onClick={() => toggleGroup(group.label)} style={s.groupHeader}>
                <span style={s.groupLabel}>{group.label}</span>
                {expanded[group.label]
                  ? <ChevronDown size={12} color="var(--text-muted)" />
                  : <ChevronRightIcon size={12} color="var(--text-muted)" />}
              </button>
            )}
            {(!group.label || collapsed || expanded[group.label]) && group.items.map(item => (
              <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  ...s.navItem,
                  ...(isActive ? s.navActive : {}),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  paddingLeft: collapsed ? '0.75rem' : group.label ? '0.9rem' : '0.75rem',
                })}>
                <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
            {group.label && !collapsed && (
              <div style={{ height: 1, background: 'var(--border)', margin: '0.4rem 0.5rem' }} />
            )}
          </div>
        ))}
      </nav>

      {/* Selector de país / timezone */}
      {!collapsed && (
        <div style={{ padding: '0 0.5rem 0.4rem', position: 'relative' }}>
          <button
            onClick={() => setShowTzPicker(p => !p)}
            title="Cambiar zona horaria"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.4rem 0.65rem', cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
            <Globe size={13} color="var(--blue)" />
            <span style={{ fontSize: '0.78rem', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pais ? `${pais.nombre} (${pais.timezone.split('/')[1]?.replace('_', ' ')})` : 'Seleccionar país'}
            </span>
            <ChevronDown size={12} />
          </button>

          {showTzPicker && (
            <div style={{ position: 'absolute', bottom: '100%', left: '0.5rem', right: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200, maxHeight: 260, overflowY: 'auto' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Zona horaria
              </div>
              {paises.map(p => (
                <button key={p.codigo}
                  onClick={() => { setPais(p); setShowTzPicker(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: pais?.codigo === p.codigo ? 'var(--accent-dim)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' as const, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{getFlagEmoji(p.codigo)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: pais?.codigo === p.codigo ? 700 : 400, color: pais?.codigo === p.codigo ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {p.timezone} · {p.moneda}
                    </p>
                  </div>
                  {pais?.codigo === p.codigo && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={s.footer}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.25rem' }}>
            <div style={{ ...s.avatar, background: `${roleInfo.color}20`, borderColor: `${roleInfo.color}40` }}>
              <span style={{ color: roleInfo.color }}>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {user?.email}
            </span>
          </div>
        )}
        {isPropietario() && !collapsed && <PushNotificationToggle />}
        {isPropietario() && collapsed  && <PushNotificationToggle compact />}
        <button onClick={handleLogout} style={{ ...s.logoutBtn, justifyContent: 'center' }} title="Cerrar sesión">
          <LogOut size={15} />{!collapsed && <span>Salir</span>}
        </button>
      </div>
    </aside>
  )
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const s: Record<string, React.CSSProperties> = {
  sidebar:     { height: '100vh', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100, transition: 'width 0.25s ease', overflow: 'hidden' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0.75rem', borderBottom: '1px solid var(--border)', minHeight: 56, gap: '0.5rem' },
  brand:       { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  brandIcon:   { width: 28, height: 28, borderRadius: 7, background: 'var(--accent-dim)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  brandName:   { fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' },
  collapseBtn: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  roleBadge:   { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.9rem', borderBottom: '1px solid var(--border)' },
  nav:         { flex: 1, padding: '0.5rem 0.35rem', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' },
  groupHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.5rem 0.2rem', fontFamily: 'var(--font-body)' },
  groupLabel:  { fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
  navItem:     { display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.52rem 0.75rem', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '0.83rem', fontWeight: 500, transition: 'background 0.15s, color 0.15s', textDecoration: 'none', whiteSpace: 'nowrap' },
  navActive:   { background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 },
  footer:      { padding: '0.6rem 0.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  avatar:      { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, border: '1px solid' },
  logoutBtn:   { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', padding: '0.45rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)', width: '100%' },
}
