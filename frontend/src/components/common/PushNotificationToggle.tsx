// src/components/common/PushNotificationToggle.tsx
import { Bell, BellOff, BellRing, Loader2, AlertTriangle } from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

interface Props {
  compact?: boolean
}

export default function PushNotificationToggle({ compact = false }: Props) {
  const { estado, activo, cargando, soportado, activar, desactivar } = usePushNotifications()

  const handleToggle = async () => {
    if (activo) {
      await desactivar()
    } else {
      const ok = await activar()
      if (!ok && estado === 'denegado') {
        alert(
          'Las notificaciones están bloqueadas.\n' +
          'Ve a Ajustes del navegador → Notificaciones → Permitir para este sitio.'
        )
      }
    }
  }

  // Mostrar siempre para propietarios — incluso si no es soportado
  // para que el usuario sepa el estado
  const cfg: Record<string, { label: string; color: string; Icon: any; disabled: boolean }> = {
    no_soportado: {
      label:    'Notif. no disponibles',
      color:    '#f87171',
      Icon:     AlertTriangle,
      disabled: true,
    },
    sin_permiso: {
      label:    'Activar notificaciones',
      color:    'var(--text-secondary)',
      Icon:     Bell,
      disabled: false,
    },
    denegado: {
      label:    'Notificaciones bloqueadas',
      color:    '#f87171',
      Icon:     BellOff,
      disabled: false,
    },
    suscrito: {
      label:    'Notificaciones activas',
      color:    'var(--green)',
      Icon:     BellRing,
      disabled: false,
    },
    no_suscrito: {
      label:    'Activar notificaciones',
      color:    'var(--text-secondary)',
      Icon:     Bell,
      disabled: false,
    },
    cargando: {
      label:    'Cargando...',
      color:    'var(--text-muted)',
      Icon:     Loader2,
      disabled: true,
    },
  }

  const { label, color, Icon, disabled } = cfg[estado] ?? cfg.cargando

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || cargando}
      title={label}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  compact ? 'center' : 'flex-start',
        gap:             '0.5rem',
        background:      activo
          ? 'rgba(62,207,142,0.1)'
          : estado === 'no_soportado' || estado === 'denegado'
            ? 'rgba(248,113,113,0.08)'
            : 'var(--bg-elevated)',
        border:          `1px solid ${
          activo
            ? 'rgba(62,207,142,0.3)'
            : estado === 'no_soportado' || estado === 'denegado'
              ? 'rgba(248,113,113,0.3)'
              : 'var(--border)'
        }`,
        borderRadius:    'var(--radius)',
        padding:         compact ? '0.45rem' : '0.45rem 0.75rem',
        cursor:          disabled ? 'not-allowed' : 'pointer',
        color,
        fontSize:        '0.8rem',
        fontFamily:      'var(--font-body)',
        fontWeight:      activo ? 600 : 400,
        opacity:         disabled && !activo ? 0.7 : 1,
        transition:      'all 0.2s ease',
        width:           '100%',
        minHeight:       '36px',
      }}
    >
      <Icon
        size={14}
        style={cargando ? { animation: 'spin 0.8s linear infinite' } : undefined}
      />
      {!compact && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  )
}
