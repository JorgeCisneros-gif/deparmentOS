// src/components/PaymentVoucherDisplay.tsx
import { useEffect, useState } from 'react'
import { ImageOff, Loader2, ZoomIn } from 'lucide-react'
import api from '../services/api'

interface Props {
  /** ID del voucher en payment_vouchers. Si null/undefined → placeholder. */
  voucherId?:    string | null
  /** Texto alt */
  alt?:          string
  /** Tamaño del thumbnail */
  width?:        number
  height?:       number
  /** Si true, hace click → modal con la imagen completa */
  clickable?:    boolean
}

/**
 * Muestra un comprobante de pago. El backend decide si servirlo desde
 * el filesystem o desde el Drive del cliente.
 *
 * Carga automática (no perezosa) — pensado para pantallas donde
 * el comprobante DEBE verse al abrir (ej. aprobación de pago).
 */
export default function PaymentVoucherDisplay({
  voucherId,
  alt = 'Comprobante de pago',
  width = 120,
  height = 120,
  clickable = true,
}: Props) {
  const [src, setSrc]   = useState<string | null>(null)
  const [err, setErr]   = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (!voucherId) {
      setSrc(null)
      setErr(false)
      return
    }

    let revokeUrl: string | null = null
    let cancelled = false
    setErr(false)
    setSrc(null)

    api.get(`/payments/voucher/${voucherId}/content`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        const url = URL.createObjectURL(data as Blob)
        revokeUrl = url
        setSrc(url)
      })
      .catch(() => !cancelled && setErr(true))

    return () => {
      cancelled = true
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [voucherId])

  if (!voucherId) {
    return (
      <div style={{
        width, height,
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)',
      }} title="Sin comprobante">
        <ImageOff size={20} />
      </div>
    )
  }

  if (err) {
    return (
      <div style={{
        width, height,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-elevated)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 10, gap: 4,
      }}>
        <ImageOff size={16} />
        <span>Error</span>
      </div>
    )
  }

  if (!src) {
    return (
      <div style={{
        width, height,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          width, height,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          cursor: clickable ? 'pointer' : 'default',
          position: 'relative',
        }}
        onClick={() => clickable && setZoom(true)}
        role={clickable ? 'button' : undefined}
        aria-label={alt}
      >
        <img src={src} alt={alt} style={{
          width: '100%', height: '100%', objectFit: 'cover',
        }} />
        {clickable && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
            <ZoomIn size={18} color="#fff" style={{ opacity: 0.8 }} />
          </div>
        )}
      </div>

      {zoom && (
        <div onClick={() => setZoom(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, padding: '1rem',
        }}>
          <img src={src} alt={alt} style={{
            maxWidth: '90vw', maxHeight: '90vh',
            borderRadius: 8, objectFit: 'contain',
          }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
