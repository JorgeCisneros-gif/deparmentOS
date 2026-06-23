import { useEffect, useState } from 'react'
import { ImageOff, Loader2, Cloud } from 'lucide-react'
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
  /** Si true, muestra un ícono de Drive cuando la foto está en Drive */
  showProviderBadge?: boolean
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error'
type StorageProvider = 'local' | 'google_drive'

interface MeterImageResponse {
  id: string
  filename: string
  storageProvider: StorageProvider
  externalUrl: string | null
  filepath?: string | null
}

/**
 * Componente reutilizable para mostrar fotos de medidores.
 *
 * Maneja 3 fuentes posibles de la imagen:
 *  - Drive del cliente (externalUrl)  → usa la URL directa
 *  - Servidor local (legacy)          → /uploads/meters/{filename}
 *  - Sin foto                         → placeholder elegante
 *
 * Estados visuales:
 *  - meterImageId null/undefined  → "Sin foto"
 *  - meter_image no existe        → "Imagen no disponible"
 *  - archivo no carga             → "Error al cargar"
 *  - badge "Drive" cuando aplica  → indica que la foto está en Drive del cliente
 */
export default function MeterImageDisplay({
  meterImageId,
  alt = 'Foto del medidor',
  width = 90,
  height = 70,
  borderColor = 'var(--border)',
  clickable = false,
  onClick,
  showProviderBadge = false,
}: Props) {
  const [state, setState] = useState<LoadState>('idle')
  const [src, setSrc] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [provider, setProvider] = useState<StorageProvider>('local')

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''

  useEffect(() => {
    if (!meterImageId) {
      setState('not-found')
      setSrc(null)
      return
    }

    setState('loading')
    api
      .get<MeterImageResponse>(`/readings/meter-image/${meterImageId}`)
      .then(({ data }) => {
        if (!data) {
          setState('not-found')
          return
        }

        setFilename(data.filename)
        setProvider(data.storageProvider)

        // Decide la fuente según el provider
        if (data.storageProvider === 'google_drive' && data.externalUrl) {
          // Imagen en Drive del cliente — URL directa
          setSrc(data.externalUrl)
          setState('loaded')
        } else if (data.filename) {
          // Imagen local — URL al servidor
          setSrc(`${apiBase}/uploads/meters/${data.filename}`)
          setState('loaded')
        } else {
          // Foto sin filepath y sin URL externa = inaccesible
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
    position: 'relative',
  }

  // ── Loading ──
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

  // ── No disponible ──
  if (state === 'not-found' || state === 'error') {
    const message = !meterImageId
      ? 'Sin foto'
      : state === 'not-found'
        ? 'Imagen no disponible'
        : 'Error al cargar'

    return (
      <div
        style={{ ...baseStyle, flexDirection: 'column', gap: 4, padding: 4 }}
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

  // ── Loaded ──
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (clickable && src) {
      window.open(src, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div style={{ ...baseStyle, padding: 0 }} title={filename || alt}>
      <img
        src={src!}
        alt={alt}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          cursor: clickable ? 'pointer' : 'default',
          display: 'block',
        }}
        onError={() => setState('error')}
        referrerPolicy="no-referrer"
      />

      {/* Badge "Drive" en la esquina si la foto está en Drive del cliente */}
      {showProviderBadge && provider === 'google_drive' && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 4,
            padding: '1px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'none',
          }}
          aria-label="Foto en Google Drive"
        >
          <Cloud size={Math.max(8, height * 0.12)} color="#fff" />
        </div>
      )}
    </div>
  )
}
