// src/components/reports/PeriodDetailDrawer.tsx
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open:     boolean
  title:    string
  subtitle?: string
  onClose:  () => void
  children: ReactNode
}

/**
 * Drawer lateral derecho que muestra el detalle de un período o pago.
 * Esc para cerrar. Click fuera del drawer también cierra.
 */
export default function PeriodDetailDrawer({
  open, title, subtitle, onClose, children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <aside style={drawer}>
        <header style={head}>
          <div>
            <p style={{
              fontSize: 11, color: 'var(--text-muted)', margin: 0,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Detalle</p>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: '2px 0 0' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={closeBtn}>
            <X size={18} />
          </button>
        </header>
        <div style={content}>
          {children}
        </div>
      </aside>
    </>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 1500,
}
const drawer: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: '100%', maxWidth: 520,
  background: 'var(--bg-surface)',
  borderLeft: '1px solid var(--border)',
  zIndex: 1600,
  display: 'flex', flexDirection: 'column',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
}
const head: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text-secondary)',
  padding: 4, marginLeft: 16, height: 28, width: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const content: React.CSSProperties = {
  padding: 20, flex: 1, overflowY: 'auto',
}
