// src/components/reports/ExportButtons.tsx
import { useState } from 'react'
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface Props {
  /**
   * Tipo de export. Determina el endpoint que se llama.
   */
  tipo: 'mediciones' | 'pagos'

  /**
   * Parámetros que se envían al backend como query params.
   */
  syncParams: Record<string, string | number | undefined>

  /**
   * Si no hay datos, deshabilitar los botones.
   */
  disabled?: boolean
}

/**
 * Botones de export PDF y CSV.
 *
 * El backend genera el archivo de forma síncrona y lo devuelve como
 * blob. Aquí lo descargamos vía <a download>. Sin colas async.
 */
export default function ExportButtons({ tipo, syncParams, disabled }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null)

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (disabled || loading) return
    setLoading(format)

    try {
      const params = new URLSearchParams()
      params.set('format', format)
      Object.entries(syncParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })

      const response = await api.get(`/reports/${tipo}/export?${params.toString()}`, {
        responseType: 'blob',
      })

      const blob = response.data as Blob
      const filename = parseFilename(response.headers['content-disposition'])
                    || `reporte_${tipo}_${Date.now()}.${format}`
      triggerDownload(blob, filename)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || `Error generando ${format.toUpperCase()}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => handleExport('pdf')}
        disabled={disabled || !!loading}
        style={btnStyle(disabled || !!loading)}
      >
        {loading === 'pdf'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <FileText size={14} />}
        <span>Exportar PDF</span>
      </button>

      <button
        onClick={() => handleExport('csv')}
        disabled={disabled || !!loading}
        style={btnStyle(disabled || !!loading)}
      >
        {loading === 'csv'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <FileSpreadsheet size={14} />}
        <span>Exportar CSV</span>
      </button>
    </div>
  )
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 32, padding: '0 12px', fontSize: 13,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}

function parseFilename(disposition: string | undefined): string | null {
  if (!disposition) return null
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  return match ? match[1] : null
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
