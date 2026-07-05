// src/components/PhotoInput.tsx
import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, X } from 'lucide-react'

interface Props {
  /** Callback con el File seleccionado (cuando el user elige). */
  onChange:    (file: File | null) => void

  /** File actualmente seleccionado (para preview). */
  value?:      File | null

  /** Texto del label cuando no hay archivo */
  placeholder?: string

  /** Tamaño del preview */
  previewHeight?: number

  /** Si true, muestra "*" indicando requerido */
  required?:   boolean
}

/**
 * Input para subir imagen con 2 opciones en móvil: tomar foto o elegir
 * de galería.
 *
 * Patrón:
 *  - "Tomar foto" usa <input capture="environment"> → abre cámara trasera
 *  - "Galería" usa <input accept="image/*"> sin capture → abre selector
 *  - Una vez elegida, muestra preview y botón para cambiarla
 *
 * Funciona en desktop y mobile. En desktop, "Tomar foto" abre la webcam
 * si el browser lo soporta; si no, abre selector normal.
 */
export default function PhotoInput({
  onChange,
  value,
  placeholder = 'Toca para subir foto',
  previewHeight = 110,
  required = false,
}: Props) {
  const cameraInputRef  = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Generar preview URL del File
  if (value && !previewUrl) {
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
  } else if (!value && previewUrl) {
    URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const handleFile = (file: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
    onChange(file)
  }

  const handleClear = () => {
    handleFile(null)
    if (cameraInputRef.current)  cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  return (
    <div>
      {/* Inputs ocultos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0] || null)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0] || null)}
      />

      {/* Preview o botones */}
      {value ? (
        <div style={{
          position: 'relative',
          border: '1.5px solid var(--green)',
          borderRadius: 'var(--radius)',
          padding: 8,
          background: 'rgba(62,207,142,0.05)',
        }}>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{
              maxHeight: previewHeight,
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: 4,
              display: 'block',
              margin: '0 auto',
            }} />
          )}
          <p style={{
            fontSize: 11, color: 'var(--green)', fontWeight: 600,
            textAlign: 'center', marginTop: 6, marginBottom: 6,
            wordBreak: 'break-all',
          }}>✓ {value.name}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button type="button" onClick={() => cameraInputRef.current?.click()}
              style={miniBtn}>
              <Camera size={12}/> Cambiar (foto)
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()}
              style={miniBtn}>
              <ImageIcon size={12}/> Cambiar (galería)
            </button>
            <button type="button" onClick={handleClear} style={{...miniBtn, color: 'var(--red)'}}>
              <X size={12}/>
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          border: '1.5px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          background: 'var(--bg-elevated)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            {placeholder} {required && <span style={{color:'var(--red)'}}>*</span>}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => cameraInputRef.current?.click()} style={mainBtn}>
              <Camera size={14}/> Tomar foto
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()} style={mainBtn}>
              <ImageIcon size={14}/> De la galería
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            JPG, PNG · máx 10 MB
          </p>
        </div>
      )}
    </div>
  )
}

const mainBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
}

const miniBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  height: 26, padding: '0 8px', fontSize: 11,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
}
