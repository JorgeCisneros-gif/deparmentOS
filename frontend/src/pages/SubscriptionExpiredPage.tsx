// src/pages/SubscriptionExpiredPage.tsx
import { useAuthStore } from '../store/auth.store'
import { AlertTriangle, Phone, Mail, LogOut } from 'lucide-react'

export default function SubscriptionExpiredPage() {
  const { user, logout } = useAuthStore()

  const isSuspended = (window as any).__subscriptionCode === 'SUBSCRIPTION_SUSPENDED'

  return (
    <div style={{
      minHeight:       '100vh',
      background:      'var(--bg)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         '2rem',
      fontFamily:      'var(--font-body)',
    }}>
      <div style={{
        maxWidth:    480,
        width:       '100%',
        textAlign:   'center',
      }}>
        {/* Icono */}
        <div style={{
          width:          80,
          height:         80,
          borderRadius:   '50%',
          background:     isSuspended ? 'rgba(245,166,35,0.1)' : 'rgba(248,113,113,0.1)',
          border:         `2px solid ${isSuspended ? 'rgba(245,166,35,0.3)' : 'rgba(248,113,113,0.3)'}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          margin:         '0 auto 1.5rem',
        }}>
          <AlertTriangle size={36} color={isSuspended ? 'var(--accent)' : '#f87171'} />
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '1.8rem',
          fontWeight:    700,
          letterSpacing: '-0.02em',
          marginBottom:  '0.75rem',
          color:         'var(--text-primary)',
        }}>
          {isSuspended ? 'Cuenta suspendida' : 'Suscripción vencida'}
        </h1>

        <p style={{
          color:         'var(--text-muted)',
          fontSize:      '0.95rem',
          lineHeight:    1.7,
          marginBottom:  '2rem',
        }}>
          {isSuspended
            ? 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador para reactivarla.'
            : 'Tu suscripción ha vencido. Para continuar usando el sistema, contacta al administrador y renueva tu plan.'
          }
        </p>

        {/* Card de contacto */}
        <div style={{
          background:    'var(--bg-surface)',
          border:        '1px solid var(--border)',
          borderRadius:  'var(--radius-lg)',
          padding:       '1.5rem',
          marginBottom:  '1.5rem',
          textAlign:     'left',
        }}>
          <p style={{
            fontSize:      '0.75rem',
            fontWeight:    600,
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom:  '1rem',
          }}>
            Contacta al administrador
          </p>

          <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
            <a href="https://wa.me/51946040444" target="_blank" rel="noreferrer"
              style={{ display:'flex',alignItems:'center',gap:'0.75rem',textDecoration:'none',color:'var(--text-primary)',padding:'0.6rem 0.75rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
              <Phone size={16} color="var(--green)" />
              <span style={{ fontSize:'0.875rem' }}>+51 946 040 444</span>
            </a>
            <a href="mailto:jorge.cisnero.bello@gmail.com"
              style={{ display:'flex',alignItems:'center',gap:'0.75rem',textDecoration:'none',color:'var(--text-primary)',padding:'0.6rem 0.75rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
              <Mail size={16} color="var(--blue)" />
              <span style={{ fontSize:'0.875rem' }}>jorge.cisnero.bello@gmail.com</span>
            </a>
          </div>
        </div>

        {/* Futuro: link a suite-os.app/planes */}
        <p style={{ fontSize:'0.8rem',color:'var(--text-dim)',marginBottom:'1.5rem' }}>
          Próximamente: ver planes disponibles en{' '}
          <a href="https://suite-os.app" target="_blank" rel="noreferrer"
            style={{ color:'var(--accent)',textDecoration:'none' }}>
            suite-os.app
          </a>
        </p>

        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '0.5rem',
            background:  'var(--bg-elevated)',
            border:      '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding:     '0.6rem 1.25rem',
            cursor:      'pointer',
            color:       'var(--text-secondary)',
            fontFamily:  'var(--font-body)',
            fontSize:    '0.875rem',
            margin:      '0 auto',
          }}
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
