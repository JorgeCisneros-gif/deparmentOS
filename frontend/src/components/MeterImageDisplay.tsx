// src/components/MeterImageDisplay.tsx
import { useEffect, useState } from 'react'
import { ImageOff, Loader2, Cloud } from 'lucide-react'
import api from '../services/api'

interface Props {
  /** ID del meter_image en DB. Si es null/undefined → placeholder. */
  meterImageId?: string | null
  alt?: string
  width?: number
  height?: number
  borderColor?: string
  clickable?: boolean
  onClick?: () => void
  showProviderBadge?: boolean
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error'
type StorageProvider = 'local' | 'google_drive'

/**
 * Muestra fotos de medidores.
 *
 * Estrategia:
 *  1. Hace metadata-fetch al endpoint /readings/meter-image/:id para
 *     determinar el provider y mostrar el badge correcto.
 *  2. Hace bytes-fetch al endpoint /content que sirve los bytes desde
 *     filesystem o desde Drive (proxiando).
 *
 * Por qué no usamos directamente externalUrl del Drive:
 *  - Google Drive devuelve text/html (página de visor) en vez de la imagen
 *    cuando se carga vía <img src>.
 *  - El backend proxia los bytes con autenticación OAuth correcta.
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
  const [state, setState]       = useState<LoadState>('idle')
  const [src, setSrc]           = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [provider, setProvider] = useState<StorageProvider>('local')

  useEffect(() => {
    if (!meterImageId) {
      setState('not-found')
      setSrc(null)
      return
    }

    let revokeUrl: string | null = null
    let cancelled = false
    setState('loading')

    const doFetch = async () => {
      try {
        // 1) Metadata
        const meta = await api.get(`/readings/meter-image/${meterImageId}`)
        if (cancelled) return
        if (!meta.data) {
          setState('not-found')
          return
        }
        setFilename(meta.data.filename)
        setProvider(meta.data.storageProvider || 'local')

        // 2) Bytes vía endpoint /content
        const bytes = await api.get(`/readings/meter-image/${meterImageId}/content`, {
          responseType: 'blob',
        })
        if (cancelled) return

        const url = URL.createObjectURL(bytes.data as Blob)
        revokeUrl = url
        setSrc(url)
        setState('loaded')

      } catch (err: any) {
        if (cancelled) return
        if (err?.response?.status === 404) setState('not-found')
        else setState('error')
      }
    }

    doFetch()

    return () => {
      cancelled = true
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [meterImageId])

  const handleClick = () => {
    if (!clickable) return
    if (onClick) onClick()
    else if (src) {
      // Default: abrir en ventana nueva
      window.open(src, '_blank')
    }
  }

  // Estados visuales
  if (state === 'not-found' || state === 'idle') {
    return (
      <div style={{
        width, height,
        border: `1px dashed ${borderColor}`,
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)',
      }} title="Sin foto">
        <ImageOff size={18} />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{
        width, height,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 10, gap: 2,
      }}>
        <ImageOff size={14} />
        <span>Error</span>
      </div>
    )
  }

  if (state === 'loading' || !src) {
    return (
      <div style={{
        width, height,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width, height,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      aria-label={alt}
    >
      <img src={src} alt={alt} style={{
        width: '100%', height: '100%', objectFit: 'cover',
      }} />
      {showProviderBadge && provider === 'google_drive' && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          background: 'rgba(0,0,0,0.65)',
          borderRadius: 3,
          padding: '1px 3px',
          display: 'flex', alignItems: 'center',
          pointerEvents: 'none',
        }} title="Foto en Google Drive">
          <Cloud size={9} color="#fff" />
        </div>
      )}
    </div>
  )
}
