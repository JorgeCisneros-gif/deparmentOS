// src/components/reports/ExportButtons.tsx
import { useState } from 'react'
import { FileText, FileSpreadsheet, FileBarChart, Loader2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface Props {
  /**
   * Tipo de export. Determina los endpoints que se llaman.
   */
  tipo: 'mediciones' | 'pagos'

  /**
   * Parámetros que se envían al backend.
   * Se pasan como query params en el GET /export y como body en el POST /queue.
   */
  syncParams:    Record<string, string | number | undefined>

  /**
   * Parámetros para el reporte ejecutivo (async, siempre via /queue).
   */
  asyncParams?:  Record<string, any>

  /**
   * Callback cuando se crea un job async. Útil para abrir el modal de progreso.
   */
  onJobCreated?: (jobId: string) => void

  /**
   * Si no hay datos, deshabilitar los botones.
   */
  disabled?:     boolean

  /**
   * Etiqueta personalizada del botón de reporte ejecutivo.
   * Default depende del tipo.
   */
  ejecutivoLabel?: string
}

export default function ExportButtons({
  tipo, syncParams, asyncParams, onJobCreated, disabled, ejecutivoLabel,
}: Props) {
  const [loading, setLoading] = useState<'pdf' | 'csv' | 'ejecutivo' | null>(null)

  /**
   * Export sync (PDF o CSV).
   * Si el backend responde 202, significa que se encoló por tamaño.
   * En ese caso, llamamos a onJobCreated.
   */
  const handleSyncExport = async (format: 'pdf' | 'csv') => {
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
        // Permitir respuestas no-2xx para detectar el 202
        validateStatus: (s) => s < 500,
      })

      if (response.status === 202) {
        // Encolado por tamaño
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result as string)
            if (data.jobId && onJobCreated) {
              onJobCreated(data.jobId)
              toast.success(data.message || 'Reporte encolado')
            }
          } catch {
            toast.error('Respuesta inesperada del servidor')
          }
        }
        reader.readAsText(response.data)
        return
      }

      // Descarga directa
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

  /**
   * Reporte ejecutivo: siempre async, va al scheduler.
   */
  const handleEjecutivo = async () => {
    if (disabled || loading) return
    setLoading('ejecutivo')

    try {
      const body = { ...syncParams, ...asyncParams, format: 'pdf' }
      const { data } = await api.post(`/reports/${tipo}/queue`, body)

      if (data?.jobId && onJobCreated) {
        onJobCreated(data.jobId)
        toast.success('Reporte encolado. Te avisamos cuando esté listo.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error encolando reporte')
    } finally {
      setLoading(null)
    }
  }

  const ejecutivoText = ejecutivoLabel
    || (tipo === 'mediciones' ? 'Reporte ejecutivo' : 'Conciliación bancaria')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => handleSyncExport('pdf')}
        disabled={disabled || !!loading}
        style={btnStyle(disabled || !!loading)}
      >
        {loading === 'pdf'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <FileText size={14} />}
        <span>Exportar PDF</span>
      </button>

      <button
        onClick={() => handleSyncExport('csv')}
        disabled={disabled || !!loading}
        style={btnStyle(disabled || !!loading)}
      >
        {loading === 'csv'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <FileSpreadsheet size={14} />}
        <span>Exportar CSV</span>
      </button>

      <button
        onClick={handleEjecutivo}
        disabled={disabled || !!loading}
        style={btnStyle(disabled || !!loading)}
      >
        {loading === 'ejecutivo'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <FileBarChart size={14} />}
        <span>{ejecutivoText}</span>
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
