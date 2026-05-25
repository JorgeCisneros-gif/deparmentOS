// src/components/ImageEditorModal.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { RotateCcw, RotateCw, Crop, Check, X, RefreshCw, Square, Trash2 } from 'lucide-react'

interface Props {
  file: File
  onConfirm: (processed: File, original: File) => void
  onCancel: () => void
}

interface Rect { x: number; y: number; w: number; h: number }

const MIN_SIZE   = 10
const BOX_PW     = 3     // grosor del borde negro de las cajas
const BOX_COLOR  = '#000000'

type Mode = 'view' | 'crop' | 'boxes'

export default function ImageEditorModal({ file, onConfirm, onCancel }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement | null>(null)

  const [rotation, setRotation]   = useState(0)
  const [crop, setCrop]           = useState<Rect | null>(null)
  const [boxes, setBoxes]         = useState<Rect[]>([])     // cajas dibujadas
  const [dragging, setDragging]   = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [currentBox, setCurrentBox] = useState<Rect | null>(null) // caja en progreso
  const [mode, setMode]           = useState<Mode>('view')
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = img; setImgLoaded(true) }
    img.src = URL.createObjectURL(file)
    return () => { URL.revokeObjectURL(img.src) }
  }, [file])

  // ── Dibujar canvas ────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const rad = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))
    const rotW = Math.round(img.width * cos + img.height * sin)
    const rotH = Math.round(img.width * sin + img.height * cos)
    canvas.width  = rotW
    canvas.height = rotH

    // Imagen rotada
    ctx.save()
    ctx.translate(rotW / 2, rotH / 2)
    ctx.rotate(rad)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()

    // ── Zona de recorte ──────────────────────────────────────────
    if (crop) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(rotW / 2, rotH / 2); ctx.rotate(rad)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      ctx.restore()

      ctx.strokeStyle = '#f5a623'; ctx.lineWidth = 3; ctx.setLineDash([])
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)

      // Grilla tercios
      ctx.strokeStyle = 'rgba(245,166,35,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4,4])
      for (let i = 1; i < 3; i++) {
        const lx = crop.x + (crop.w / 3) * i
        ctx.beginPath(); ctx.moveTo(lx, crop.y); ctx.lineTo(lx, crop.y + crop.h); ctx.stroke()
        const ly = crop.y + (crop.h / 3) * i
        ctx.beginPath(); ctx.moveTo(crop.x, ly); ctx.lineTo(crop.x + crop.w, ly); ctx.stroke()
      }
      ctx.setLineDash([])

      // Handles esquinas
      const hs = 12
      ;[[crop.x, crop.y],[crop.x+crop.w-hs, crop.y],[crop.x, crop.y+crop.h-hs],[crop.x+crop.w-hs, crop.y+crop.h-hs]].forEach(([hx,hy]) => {
        ctx.fillStyle='#f5a623'; ctx.fillRect(hx,hy,hs,hs)
        ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1; ctx.strokeRect(hx,hy,hs,hs)
      })
    }

    // ── Cajas de dígitos (confirmadas) ───────────────────────────
    boxes.forEach(b => {
      ctx.strokeStyle = BOX_COLOR
      ctx.lineWidth   = BOX_PW
      ctx.setLineDash([])
      ctx.strokeRect(b.x, b.y, b.w, b.h)
    })

    // ── Caja en progreso (mientras arrastra) ──────────────────────
    if (currentBox) {
      ctx.strokeStyle = BOX_COLOR
      ctx.lineWidth   = BOX_PW
      ctx.setLineDash([6, 3])
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.w, currentBox.h)
      ctx.setLineDash([])
    }

  }, [rotation, crop, boxes, currentBox])

  useEffect(() => { if (imgLoaded) draw() }, [imgLoaded, draw])

  // ── Posición relativa al canvas ───────────────────────────────
  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const makeRect = (start: {x:number;y:number}, end: {x:number;y:number}): Rect => {
    const canvas = canvasRef.current!
    const x = clamp(Math.min(start.x, end.x), 0, canvas.width)
    const y = clamp(Math.min(start.y, end.y), 0, canvas.height)
    const w = clamp(Math.abs(end.x - start.x), 0, canvas.width - x)
    const h = clamp(Math.abs(end.y - start.y), 0, canvas.height - y)
    return { x, y, w, h }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (mode === 'view') return
    setDragStart(getCanvasPos(e))
    if (mode === 'crop') setCrop(null)
    if (mode === 'boxes') setCurrentBox(null)
    setDragging(true)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const r = makeRect(dragStart, getCanvasPos(e))
    if (mode === 'crop')  setCrop(r)
    if (mode === 'boxes') setCurrentBox(r)
  }

  const onMouseUp = () => {
    setDragging(false)
    if (mode === 'crop') {
      if (crop && (crop.w < MIN_SIZE || crop.h < MIN_SIZE)) setCrop(null)
    }
    if (mode === 'boxes') {
      if (currentBox && currentBox.w >= MIN_SIZE && currentBox.h >= MIN_SIZE) {
        setBoxes(prev => [...prev, currentBox])
      }
      setCurrentBox(null)
    }
  }

  const rotateStep = (deg: number) => {
    setCrop(null); setBoxes([]); setCurrentBox(null)
    setRotation(r => (r + deg + 360) % 360)
  }

  const resetAll = () => {
    setRotation(0); setCrop(null); setBoxes([]); setCurrentBox(null); setMode('view')
  }

  // ── Generar imagen procesada ──────────────────────────────────
  const handleConfirm = async () => {
    const img = imgRef.current!
    const rad = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))
    const rotW = Math.round(img.width * cos + img.height * sin)
    const rotH = Math.round(img.width * sin + img.height * cos)

    // Canvas con imagen rotada
    const rotCanvas = document.createElement('canvas')
    rotCanvas.width = rotW; rotCanvas.height = rotH
    const rCtx = rotCanvas.getContext('2d')!
    rCtx.save(); rCtx.translate(rotW/2, rotH/2); rCtx.rotate(rad)
    rCtx.drawImage(img, -img.width/2, -img.height/2); rCtx.restore()

    // Aplicar cajas (borde negro) a la imagen rotada
    if (boxes.length > 0) {
      rCtx.strokeStyle = BOX_COLOR
      rCtx.lineWidth   = BOX_PW
      rCtx.setLineDash([])
      boxes.forEach(b => rCtx.strokeRect(b.x, b.y, b.w, b.h))
    }

    // Canvas final (recortado si aplica)
    const outCanvas = document.createElement('canvas')
    const ctx       = outCanvas.getContext('2d')!

    if (crop && crop.w >= MIN_SIZE && crop.h >= MIN_SIZE) {
      outCanvas.width = crop.w; outCanvas.height = crop.h
      ctx.drawImage(rotCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
    } else {
      outCanvas.width = rotW; outCanvas.height = rotH
      ctx.drawImage(rotCanvas, 0, 0)
    }

    const blob = await new Promise<Blob>(res => outCanvas.toBlob(b => res(b!), 'image/jpeg', 0.95))
    const processedFile = new File([blob], `ocr_${file.name}`, { type:'image/jpeg' })
    onConfirm(processedFile, file)
  }

  const cursor = mode === 'crop' ? 'crosshair' : mode === 'boxes' ? 'crosshair' : 'default'

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:'1rem',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:860,maxHeight:'96vh',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-lg)',overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.9rem 1.25rem',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700,marginBottom:'0.1rem' }}>Ajustar imagen del medidor</h2>
            <p style={{ fontSize:'0.73rem',color:'var(--text-muted)' }}>Rota · Recorta · Dibuja cajas sobre los dígitos para mejorar el OCR</p>
          </div>
          <button onClick={onCancel} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)',flexShrink:0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex',gap:'0.4rem',padding:'0.6rem 1.25rem',borderBottom:'1px solid var(--border)',flexWrap:'wrap',alignItems:'center',flexShrink:0,background:'var(--bg-elevated)' }}>

          {/* Rotar */}
          <div style={{ display:'flex',gap:'0.3rem',alignItems:'center' }}>
            <span style={s.toolLabel}>Rotar</span>
            <ToolBtn onClick={() => rotateStep(-90)} title="-90°"><RotateCcw size={13}/><span style={s.toolTxt}>-90°</span></ToolBtn>
            <ToolBtn onClick={() => rotateStep(90)}  title="+90°"><RotateCw  size={13}/><span style={s.toolTxt}>+90°</span></ToolBtn>
            <ToolBtn onClick={() => rotateStep(180)} title="180°"><RefreshCw size={13}/><span style={s.toolTxt}>180°</span></ToolBtn>
          </div>

          <Divider />

          {/* Recorte */}
          <div style={{ display:'flex',gap:'0.3rem',alignItems:'center' }}>
            <span style={s.toolLabel}>Recorte</span>
            <ToolBtn onClick={() => setMode(m => m==='crop'?'view':'crop')} active={mode==='crop'}>
              <Crop size={13}/><span style={s.toolTxt}>{mode==='crop'?'Dibujando…':'Zona'}</span>
            </ToolBtn>
            {crop && <ToolBtn onClick={() => setCrop(null)}><X size={11}/><span style={s.toolTxt}>Quitar</span></ToolBtn>}
          </div>

          <Divider />

          {/* Cajas de dígitos */}
          <div style={{ display:'flex',gap:'0.3rem',alignItems:'center' }}>
            <span style={s.toolLabel}>Cajas</span>
            <ToolBtn
              onClick={() => setMode(m => m==='boxes'?'view':'boxes')}
              active={mode==='boxes'}
              color="#3b82f6"
              title="Dibujar cajas negras sobre los dígitos"
            >
              <Square size={13}/><span style={s.toolTxt}>{mode==='boxes'?'Dibujando…':'Dibujar caja'}</span>
            </ToolBtn>
            {boxes.length > 0 && (
              <>
                <span style={{ fontSize:'0.72rem',color:'var(--text-muted)',padding:'0 0.1rem' }}>{boxes.length} caja{boxes.length>1?'s':''}</span>
                <ToolBtn onClick={() => setBoxes(prev => prev.slice(0,-1))} title="Deshacer última caja">
                  <RotateCcw size={11}/><span style={s.toolTxt}>Deshacer</span>
                </ToolBtn>
                <ToolBtn onClick={() => setBoxes([])} title="Borrar todas las cajas">
                  <Trash2 size={11}/><span style={s.toolTxt}>Borrar todas</span>
                </ToolBtn>
              </>
            )}
          </div>

          <Divider />
          <ToolBtn onClick={resetAll}><RefreshCw size={12}/><span style={s.toolTxt}>Restablecer</span></ToolBtn>
        </div>

        {/* Slider rotación */}
        <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem 1.25rem',borderBottom:'1px solid var(--border)',flexShrink:0,background:'rgba(0,0,0,0.12)' }}>
          <span style={{ ...s.toolLabel, flexShrink:0 }}>Giro fino</span>
          <input type="range" min="-180" max="180"
            value={rotation <= 180 ? rotation : rotation - 360}
            onChange={e => { setCrop(null); setBoxes([]); setRotation(((parseInt(e.target.value)%360)+360)%360) }}
            style={{ flex:1, accentColor:'var(--accent)', cursor:'pointer' }} />
          <span style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--accent)',minWidth:40,textAlign:'right',fontVariantNumeric:'tabular-nums' }}>
            {rotation <= 180 ? rotation : rotation - 360}°
          </span>
          {rotation !== 0 && (
            <button onClick={() => { setRotation(0); setCrop(null); setBoxes([]) }}
              style={{ fontSize:'0.7rem',color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',flexShrink:0 }}>✕</button>
          )}
        </div>

        {/* Instrucciones modo activo */}
        {mode === 'crop' && (
          <div style={{ background:'rgba(245,166,35,0.08)',borderBottom:'1px solid rgba(245,166,35,0.2)',padding:'0.4rem 1.25rem',flexShrink:0 }}>
            <p style={{ fontSize:'0.77rem',color:'var(--accent)' }}>✏️ Arrastra para seleccionar la zona a enviar al OCR</p>
          </div>
        )}
        {mode === 'boxes' && (
          <div style={{ background:'rgba(59,130,246,0.08)',borderBottom:'1px solid rgba(59,130,246,0.2)',padding:'0.4rem 1.25rem',flexShrink:0 }}>
            <p style={{ fontSize:'0.77rem',color:'#60a5fa' }}>
              ⬛ Arrastra para dibujar una caja negra alrededor de cada dígito — el OCR los detecta mejor separados
            </p>
          </div>
        )}

        {/* Canvas */}
        <div ref={containerRef} style={{ flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'center',background:'#080a10' }}>
          {!imgLoaded ? (
            <div style={{ color:'var(--text-muted)',fontSize:'0.875rem' }}>Cargando imagen...</div>
          ) : (
            <canvas ref={canvasRef}
              style={{ maxWidth:'100%',maxHeight:'52vh',display:'block',margin:'0 auto',cursor,borderRadius:6,border:'1px solid var(--border)' }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}    onMouseLeave={onMouseUp} />
          )}
        </div>

        {/* Info zona */}
        {crop && crop.w >= MIN_SIZE && (
          <div style={{ padding:'0.35rem 1.25rem',background:'rgba(62,207,142,0.06)',borderTop:'1px solid rgba(62,207,142,0.15)',flexShrink:0 }}>
            <p style={{ fontSize:'0.73rem',color:'var(--green)' }}>
              ✓ Zona de recorte: {Math.round(crop.w)} × {Math.round(crop.h)} px
              {boxes.length > 0 ? ` · ${boxes.length} caja${boxes.length>1?'s':''} de dígitos` : ''}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.85rem 1.25rem',borderTop:'1px solid var(--border)',flexShrink:0,gap:'1rem',flexWrap:'wrap' }}>
          <p style={{ fontSize:'0.73rem',color:'var(--text-muted)' }}>
            💾 La imagen <strong>original</strong> siempre se guarda · Las cajas se aplican solo a la imagen enviada al OCR
          </p>
          <div style={{ display:'flex',gap:'0.75rem' }}>
            <button onClick={onCancel}
              style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontSize:'0.875rem',padding:'0.5rem 0.9rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' }}>
              Cancelar
            </button>
            <button onClick={() => setShowPreview(true)}
              style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',color:'#60a5fa',fontSize:'0.875rem',padding:'0.5rem 0.9rem',borderRadius:'var(--radius)',border:'1px solid rgba(96,165,250,0.4)',cursor:'pointer',fontFamily:'var(--font-body)' }}>
              👁 Ver resultado
            </button>
            <button onClick={handleConfirm}
              style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--accent)',color:'#0f1117',fontWeight:700,fontSize:'0.875rem',padding:'0.5rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
              <Check size={14}/>
              {crop && crop.w >= MIN_SIZE
                ? boxes.length > 0 ? `Enviar zona + ${boxes.length} caja${boxes.length>1?'s':''}` : 'Enviar zona al OCR'
                : boxes.length > 0 ? `Enviar con ${boxes.length} caja${boxes.length>1?'s':''}` : 'Enviar imagen al OCR'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Popup preview */}
      {showPreview && (
        <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,borderRadius:'var(--radius-lg)' }}
          onClick={() => setShowPreview(false)}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',padding:'1.25rem',maxWidth:480,width:'90%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem' }}>
              <p style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--text-primary)' }}>📤 Imagen que se enviará al OCR</p>
              <button onClick={() => setShowPreview(false)}
                style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex' }}>
                <X size={16}/>
              </button>
            </div>
            <OcrPreview imgRef={imgRef} rotation={rotation} crop={crop} boxes={boxes} imgLoaded={imgLoaded} />
            <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.5rem',marginTop:'1rem' }}>
              <button onClick={() => setShowPreview(false)}
                style={{ fontSize:'0.82rem',padding:'0.45rem 0.9rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',background:'var(--bg-elevated)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Cerrar
              </button>
              <button onClick={() => { setShowPreview(false); handleConfirm() }}
                style={{ fontSize:'0.82rem',padding:'0.45rem 0.9rem',borderRadius:'var(--radius)',border:'none',background:'var(--accent)',color:'#0f1117',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'0.4rem' }}>
                <Check size={13}/> Confirmar y enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function ToolBtn({ children, onClick, active, color, title }: any) {
  const activeColor = color || 'var(--accent)'
  return (
    <button onClick={onClick} title={title}
      style={{ display:'flex',alignItems:'center',gap:'0.3rem',background:active?`${activeColor}18`:'var(--bg-surface)',border:`1px solid ${active?`${activeColor}55`:'var(--border)'}`,color:active?activeColor:'var(--text-secondary)',borderRadius:6,padding:'0.28rem 0.55rem',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--font-body)',fontWeight:active?600:400,transition:'all 0.15s' }}>
      {children}
    </button>
  )
}

function Divider() {
  return <div style={{ width:1,height:22,background:'var(--border)',margin:'0 0.2rem' }} />
}

const s = {
  toolLabel: { fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginRight:'0.1rem' },
  toolTxt:   { fontSize:'0.72rem' },
}

// ── Preview de imagen que se enviará al OCR ───────────────────
// Se actualiza en tiempo real cada vez que cambia recorte o cajas.

function OcrPreview({ imgRef, rotation, crop, boxes, imgLoaded }: {
  imgRef: React.MutableRefObject<HTMLImageElement | null>
  rotation: number; crop: Rect | null; boxes: Rect[]; imgLoaded: boolean
}) {
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = previewRef.current
    const img    = imgRef.current
    if (!canvas || !img || !imgLoaded) return
    const ctx = canvas.getContext('2d')!

    const rad = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad))
    const cos = Math.abs(Math.cos(rad))
    const rotW = Math.round(img.width * cos + img.height * sin)
    const rotH = Math.round(img.width * sin + img.height * cos)

    // Dibujar imagen rotada en canvas temporal
    const tmp = document.createElement('canvas')
    tmp.width = rotW; tmp.height = rotH
    const tCtx = tmp.getContext('2d')!
    tCtx.save(); tCtx.translate(rotW/2, rotH/2); tCtx.rotate(rad)
    tCtx.drawImage(img, -img.width/2, -img.height/2); tCtx.restore()

    // Aplicar cajas al temporal
    if (boxes.length > 0) {
      tCtx.strokeStyle = BOX_COLOR; tCtx.lineWidth = BOX_PW; tCtx.setLineDash([])
      boxes.forEach(b => tCtx.strokeRect(b.x, b.y, b.w, b.h))
    }

    // Extraer región: recortada o completa
    let srcX = 0, srcY = 0, srcW = rotW, srcH = rotH
    if (crop && crop.w >= MIN_SIZE && crop.h >= MIN_SIZE) {
      srcX = crop.x; srcY = crop.y; srcW = crop.w; srcH = crop.h
    }

    // Escalar al canvas de preview (máx 300px ancho)
    const maxW = 300
    const scale = Math.min(1, maxW / srcW)
    canvas.width  = Math.round(srcW * scale)
    canvas.height = Math.round(srcH * scale)
    ctx.drawImage(tmp, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)

  }, [imgLoaded, rotation, crop, boxes])

  if (!imgLoaded) return null

  return (
    <div>
      <div>
        <canvas
          ref={previewRef}
          style={{ display:'block', borderRadius:6, border:'1px solid var(--border)', maxWidth:'100%', width:'100%', imageRendering:'pixelated', marginBottom:'0.75rem' }}
        />
      </div>
      <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', lineHeight:1.6, display:'none' }}>
        {crop && crop.w >= MIN_SIZE
          ? <><span style={{ color:'var(--green)' }}>✓ Recorte aplicado</span><br/></>
          : <><span style={{ color:'var(--text-muted)' }}>Sin recorte — imagen completa</span><br/></>
        }
        {boxes.length > 0
          ? <span style={{ color:'#60a5fa' }}>✓ {boxes.length} caja{boxes.length>1?'s':''} dibujada{boxes.length>1?'s':''}</span>
          : <span style={{ color:'var(--text-muted)' }}>Sin cajas de dígitos</span>
        }
        {rotation !== 0 && <><br/><span style={{ color:'var(--accent)' }}>✓ Rotación: {rotation <= 180 ? rotation : rotation - 360}°</span></>}
      </div>
    </div>
  )
}
