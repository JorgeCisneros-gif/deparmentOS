import { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import api from '../services/api'

interface Props {
  /** ID del meter_image en DB. Si es null/undefined, muestra placeholder directo. */
  meterImageId?: string | null
  /** Texto alt y aria-label */
  alt?: string
  /** Tamaño visual (se aplica como width/height) */
  width?: number
  height?: number
  /** Estilo de borde extra */
  borderColor?: string
  /** Si true, al hacer clic abre la imagen completa en modal */
  clickable?: boolean
  /** Callback opcional al clickear (override del comportamiento default) */
  onClick?: () => void
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error'

/**
 * Componente reutilizable para mostrar fotos de medidores.
 *
 * Maneja elegantemente todos los estados de error:
 * - meterImageId null/undefined → placeholder "sin foto"
 * - meter_image no existe en DB → placeholder "imagen no disponible"
 * - archivo no se puede cargar (404, Drive eliminado, sin permisos) → placeholder
 *
 * Diseñado para usarse en:
 * - Página de nueva medición (preview de medición existente)
 * - Historial de mediciones
 * - Detalle de medición
 * - Cualquier vista que muestre lecturas con foto
 */
export default function MeterImageDisplay({
  meterImageId,
  alt = 'Foto del medidor',
  width = 90,
  height = 70,
  borderColor = 'var(--border)',
  clickable = false,
  onClick,
}: Props) {
  const [state, setState] = useState<LoadState>('idle')
  const [src, setSrc] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''

  useEffect(() => {
    // Si no hay ID, es lectura manual sin foto
    if (!meterImageId) {
      setState('not-found')
      setSrc(null)
      return
    }

    setState('loading')
    api.get(`/readings/meter-image/${meterImageId}`)
      .then(({ data }) => {
        if (data?.filename) {
          setFilename(data.filename)
          setSrc(`${apiBase}/uploads/meters/${data.filename}`)
          setState('loaded')
        } else {
          setState('not-found')
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setState('not-found')
        } else {
          setState('error')
        }
      })
  }, [meterImageId, apiBase])

  // ── Estilo base del contenedor ──
  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: 6,
    border: `1px solid ${borderColor}`,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: clickable ? 'pointer' : 'default',
    overflow: 'hidden',
    background: 'var(--bg-elevated)',
  }

  // ── Estados ──

  if (state === 'loading' || state === 'idle') {
    return (
      <div style={baseStyle} aria-label="Cargando imagen del medidor">
        <Loader2
          size={Math.min(width, height) * 0.3}
          color="var(--text-muted)"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
      </div>
    )
  }

  if (state === 'not-found' || state === 'error') {
    const message = !meterImageId
      ? 'Sin foto'
      : state === 'not-found'
      ? 'Imagen no disponible'
      : 'Error al cargar'

    return (
      <div
        style={{
          ...baseStyle,
          flexDirection: 'column',
          gap: 4,
          padding: 4,
        }}
        title={message}
        aria-label={message}
      >
        <ImageOff size={Math.min(width, height) * 0.32} color="var(--text-muted)" />
        <p
          style={{
            fontSize: Math.min(width, height) * 0.11,
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {message}
        </p>
      </div>
    )
  }

  // state === 'loaded'
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (clickable && src) {
      window.open(src, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <img
      src={src!}
      alt={alt}
      title={filename || alt}
      onClick={handleClick}
      style={{
        width,
        height,
        objectFit: 'cover',
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        flexShrink: 0,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onError={() => {
        // Si la imagen falla al cargar en el browser (404, red, etc.)
        // cambiamos a estado de error sin romper el layout
        setState('error')
      }}
    />
  )
}
