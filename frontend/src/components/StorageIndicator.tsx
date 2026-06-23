import { useEffect, useState } from 'react'
import { Cloud, HardDrive, AlertCircle, Loader2 } from 'lucide-react'
import api from '../services/api'

interface StorageIndicatorState {
  mode: 'drive' | 'local' | 'unavailable'
  label: string
  color: 'green' | 'yellow' | 'red'
  detail?: string
}

/**
 * Indicador compacto del modo de almacenamiento de fotos del medidor.
 *
 * Se muestra en el header del dashboard junto al "En vivo".
 * Estados visuales:
 *  - 🟢 Drive conectado          → todo OK
 *  - 🟡 Almacenamiento local     → sin Drive, fotos en servidor
 *  - 🔴 Drive con error          → reconectar
 *  - ⚪ Cargando                  → consultando estado
 *
 * Se actualiza cada 60s y al click muestra el detalle.
 */
export default function StorageIndicator() {
  const [state, setState] = useState<StorageIndicatorState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      try {
        const { data } = await api.get<StorageIndicatorState>('/storage/indicator')
        if (!cancelled) {
          setState(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            mode: 'unavailable',
            label: 'Sin conexión',
            color: 'red',
            detail: 'No se pudo consultar el estado',
          })
          setLoading(false)
        }
      }
    }

    fetchStatus()
    const t = setInterval(fetchStatus, 60_000)

    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  // ── Loading ──
  if (loading || !state) {
    return (
      <div style={containerStyle('var(--text-muted)')}>
        <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={labelStyle}>Almacenamiento</span>
      </div>
    )
  }

  const Icon = state.mode === 'drive'
    ? Cloud
    : state.mode === 'local'
      ? HardDrive
      : AlertCircle

  const colorVar = state.color === 'green'
    ? 'var(--green)'
    : state.color === 'yellow'
      ? 'var(--yellow, #f5b945)'
      : 'var(--red)'

  return (
    <div
      style={{
        ...containerStyle(colorVar),
        cursor: state.detail ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={() => setShowDetail((v) => !v)}
      onMouseEnter={() => setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
      title={state.detail}
      aria-label={state.label}
    >
      <Icon size={11} color={colorVar} />
      <span style={labelStyle}>{state.label}</span>

      {/* Tooltip con detalle */}
      {showDetail && state.detail && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {state.detail}
        </div>
      )}
    </div>
  )
}

const containerStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  background: 'var(--bg-surface)',
  border: `1px solid var(--border)`,
  borderRadius: 20,
  padding: '0.4rem 0.8rem',
  transition: 'all 0.2s ease',
})

const labelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
}
