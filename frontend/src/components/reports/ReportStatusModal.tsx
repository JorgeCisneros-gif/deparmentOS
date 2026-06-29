// src/components/reports/ReportStatusModal.tsx
import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface JobStatus {
  id:            string
  tipo:          string
  estado:        'pending' | 'processing' | 'done' | 'failed'
  formato:       string
  rowsProcessed: number | null
  resultSizeKb:  number | null
  error:         string | null
  createdAt:     string
  completedAt:   string | null
}

interface Props {
  jobId:  string | null
  onClose: () => void
}

/**
 * Modal que sigue el progreso de un job de reporte asíncrono.
 *
 * Polling cada 2 segundos hasta que el estado sea 'done' o 'failed'.
 * Cuando está done, muestra botón de descarga.
 */
export default function ReportStatusModal({ jobId, onClose }: Props) {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    let timeoutId: any

    const poll = async () => {
      try {
        const { data } = await api.get<JobStatus>(`/reports/jobs/${jobId}`)
        if (cancelled) return
        setJob(data)
        setError(null)
        if (data.estado === 'pending' || data.estado === 'processing') {
          timeoutId = setTimeout(poll, 2000)
        }
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'No se pudo consultar el reporte')
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [jobId])

  const handleDownload = async () => {
    if (!jobId || downloading) return
    setDownloading(true)
    try {
      const response = await api.get(`/reports/jobs/${jobId}/download`, {
        responseType: 'blob',
      })
      const blob = response.data as Blob
      const filename = parseFilename(response.headers['content-disposition'])
                    || `reporte_${jobId}.${job?.formato || 'pdf'}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      toast.error('No se pudo descargar el reporte')
    } finally {
      setDownloading(false)
    }
  }

  if (!jobId) return null

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
            Generando reporte
          </h3>
          <button aria-label="Cerrar" onClick={onClose} style={closeBtn}>
            <X size={18} />
          </button>
        </div>

        <div style={body}>
          {error && (
            <div style={errorBox}>
              <AlertCircle size={18} color="var(--red)" />
              <span>{error}</span>
            </div>
          )}

          {!error && !job && (
            <div style={loadingBox}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span>Consultando estado…</span>
            </div>
          )}

          {!error && job?.estado === 'pending' && (
            <div style={loadingBox}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span>En cola — el procesador lo tomará en unos segundos…</span>
            </div>
          )}

          {!error && job?.estado === 'processing' && (
            <div style={loadingBox}>
              <Loader2 size={20} color="var(--blue)" style={{ animation: 'spin 0.8s linear infinite' }} />
              <span>Procesando el reporte…</span>
            </div>
          )}

          {job?.estado === 'done' && (
            <>
              <div style={successBox}>
                <CheckCircle2 size={22} color="var(--green)" />
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>Reporte listo</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    {job.rowsProcessed} filas · {job.resultSizeKb} KB · {job.formato.toUpperCase()}
                  </p>
                </div>
              </div>
              <button onClick={handleDownload} disabled={downloading} style={downloadBtn}>
                {downloading
                  ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Download size={16} />}
                <span>Descargar</span>
              </button>
            </>
          )}

          {job?.estado === 'failed' && (
            <div style={errorBox}>
              <AlertCircle size={20} color="var(--red)" />
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>El reporte falló</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {job.error || 'Error desconocido'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function parseFilename(disposition: string | undefined): string | null {
  if (!disposition) return null
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  return match ? match[1] : null
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: '1rem',
}
const modal: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  maxWidth: 440, width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}
const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 18px', borderBottom: '1px solid var(--border)',
}
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text-secondary)', padding: 4,
}
const body: React.CSSProperties = { padding: 18 }
const loadingBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: 14,
  background: 'var(--bg-elevated)',
  borderRadius: 'var(--radius)',
  fontSize: 14, color: 'var(--text-secondary)',
}
const successBox: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
  padding: 14, marginBottom: 12,
  background: 'var(--bg-elevated)',
  borderRadius: 'var(--radius)',
}
const errorBox: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
  padding: 14,
  background: 'var(--bg-elevated)',
  borderRadius: 'var(--radius)',
  fontSize: 13, color: 'var(--text-primary)',
}
const downloadBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', height: 38,
  background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius)',
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
