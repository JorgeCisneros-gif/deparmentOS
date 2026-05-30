import { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import { Droplets, Camera, Upload, CheckCircle2, Loader2, X, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'
import ImageEditorModal from '../components/ImageEditorModal'
import { MESES_CORTO, TIPO_SERVICIO_CFG, getUnidadLabel, getReciboLabel, MODOS_CON_MEDICION } from '../constants'

type Step = 'periodo' | 'upload' | 'confirm' | 'done'
const STEPS: Step[] = ['periodo','upload','confirm','done']
const STEP_LABELS = ['Período','Fotografía','Confirmar','Listo']

const btn: React.CSSProperties  = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.65rem 1.2rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }

function Field({ label, children }: any) {
  return (
    <div style={{ flex:1, minWidth:180 }}>
      <label style={{ fontSize:'0.78rem',fontWeight:500,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

export default function NewReadingPage() {
  const [step, setStep]                           = useState<Step>('periodo')
  const [buildings, setBuildings]                 = useState<any[]>([])
  const [services, setServices]                   = useState<any[]>([])
  const [depts, setDepts]                         = useState<any[]>([])
  const [receipts, setReceipts]                   = useState<any[]>([])
  const [selectedBuilding, setSelectedBuilding]   = useState('')
  const [mes, setMes]                             = useState(new Date().getMonth() + 1)
  const [anio, setAnio]                           = useState(new Date().getFullYear())
  const [validation, setValidation]               = useState<any>(null)
  const [selectedRecibo, setSelectedRecibo]       = useState('')
  const [selectedDepto, setSelectedDepto]         = useState('')
  const [selectedServicio, setSelectedServicio]   = useState('')
  const [svcsConMedicion, setSvcsConMedicion]     = useState<any[]>([])
  const [lecturaAnterior, setLecturaAnterior]     = useState('')
  const [lecturaAnteriorAuto, setLecturaAnteriorAuto] = useState(false)
  const [modoManual, setModoManual]               = useState(false)
  const [montoCalculado, setMontoCalculado]       = useState('')
  const [imageFile, setImageFile]                 = useState<File | null>(null)
  const [originalFile, setOriginalFile]           = useState<File | null>(null)
  const [imagePreview, setImagePreview]           = useState('')
  const [showEditor, setShowEditor]               = useState(false)
  const [imageFueEditada, setImageFueEditada]     = useState(false)
  const [medicionExistente, setMedicionExistente] = useState<any>(null)
  const [uploading, setUploading]                 = useState(false)
  const [ocrResult, setOcrResult]                 = useState<any>(null)
  const [lecturaConfirmada, setLecturaConfirmada] = useState('')
  const [confirming, setConfirming]               = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { fmt } = useTz()
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || ''

  // ── Servicio activo y sus propiedades dinámicas ───────────────
  const svcActivo   = svcsConMedicion.find(s => s.id === selectedServicio) || svcsConMedicion[0]
  const tipoActivo  = svcActivo?.tipo || 'agua'
  const svcCfg      = TIPO_SERVICIO_CFG[tipoActivo] || TIPO_SERVICIO_CFG['agua']
  const unidad      = getUnidadLabel(svcActivo?.unidadMedida)
  const labelRecibo = getReciboLabel(tipoActivo)

  useEffect(() => { api.get('/buildings').then(r => setBuildings(r.data)) }, [])

  useEffect(() => {
    if (!selectedBuilding) return
    Promise.all([
      api.get('/services', { params: { buildingId: selectedBuilding } }),
      api.get('/departments', { params: { buildingId: selectedBuilding } }),
    ]).then(([sRes, dRes]) => { setServices(sRes.data); setDepts(dRes.data) })
  }, [selectedBuilding])

  useEffect(() => {
    if (!selectedDepto) return
    setLecturaAnterior(''); setLecturaAnteriorAuto(false)
    api.get(`/readings/history/${selectedDepto}`)
      .then(({ data }) => {
        if (data.historial && data.historial.length > 0) {
          const ultima  = data.historial[0]
          const lectura = ultima.lectura_actual ?? ultima.lecturaActual
          if (lectura != null && lectura !== '') {
            setLecturaAnterior(String(lectura)); setLecturaAnteriorAuto(true)
          }
        }
      }).catch(() => {})
  }, [selectedDepto])

  useEffect(() => {
    if (!selectedDepto || !selectedRecibo) { setMedicionExistente(null); return }
    api.get('/readings', { params: { receiptId: selectedRecibo, deptId: selectedDepto } })
      .then(({ data }) => { setMedicionExistente(data && data.length > 0 ? data[0] : null) })
      .catch(() => setMedicionExistente(null))
  }, [selectedDepto, selectedRecibo])

  const validatePeriod = async () => {
    if (!selectedBuilding) return toast.error('Selecciona un edificio')
    try {
      const { data } = await api.get('/receipts/validate-period', { params: { buildingId: selectedBuilding, month: mes, year: anio } })
      setValidation(data)
      if (data.listo) {
        const svcs = services.filter((s: any) => MODOS_CON_MEDICION.includes(s.modoCalculo))
        setSvcsConMedicion(svcs)

        if (svcs.length === 0) {
          toast('Este edificio no tiene servicios que requieran medición individual', { icon: 'ℹ️' })
          setValidation({ ...data, sinMedicion: true }); return
        }

        const svcInicial = svcs[0]
        setSelectedServicio(svcInicial.id)
        const rRes = await api.get('/receipts', { params: { serviceId: svcInicial.id, year: anio, month: mes } })
        setReceipts(rRes.data)
        if (rRes.data.length > 0) setSelectedRecibo(rRes.data[0].id)

        if (svcs.length === 1) setStep('upload')
        else setValidation({ ...data, seleccionarServicio: true, svcs })
      }
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Error validando período') }
  }

  const handleServicioChange = async (svcId: string) => {
    setSelectedServicio(svcId); setSelectedRecibo('')
    try {
      const rRes = await api.get('/receipts', { params: { serviceId: svcId, year: anio, month: mes } })
      setReceipts(rRes.data)
      if (rRes.data.length > 0) setSelectedRecibo(rRes.data[0].id)
    } catch { toast.error('Error cargando recibos del servicio') }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setOriginalFile(file); setImageFile(null)
    setImagePreview(URL.createObjectURL(file)); setOcrResult(null)
    setLecturaConfirmada(''); setImageFueEditada(false); setShowEditor(true)
  }

  const handleEditorConfirm = (processed: File, original: File) => {
    setImageFile(processed); setOriginalFile(original)
    setImagePreview(URL.createObjectURL(original))
    setImageFueEditada(processed !== original); setShowEditor(false)
  }

  const uploadOcr = async () => {
    if (!imageFile || !selectedDepto || !selectedRecibo) return toast.error('Completa todos los campos')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('departamentoId', selectedDepto)
      form.append('reciboId', selectedRecibo)
      form.append('image', imageFile)
      if (originalFile && originalFile !== imageFile) form.append('original', originalFile)
      const { data } = await api.post('/readings/ocr', form)
      setOcrResult(data); setLecturaConfirmada(String(data.ocrResult.lecturaFinal)); setStep('confirm')
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Error procesando imagen') }
    finally { setUploading(false) }
  }

  useEffect(() => {
    if (!lecturaConfirmada || !lecturaAnterior || !selectedRecibo) return
    const recibo = receipts.find((r: any) => r.id === selectedRecibo)
    if (!recibo?.precioM3) return
    const consumo = parseFloat(lecturaConfirmada) - parseFloat(lecturaAnterior)
    if (consumo > 0) setMontoCalculado((consumo * parseFloat(recibo.precioM3)).toFixed(2))
  }, [lecturaConfirmada, lecturaAnterior, selectedRecibo])

  const confirmOcr = async () => {
    if (!ocrResult || !lecturaAnterior || !montoCalculado) return toast.error('Completa la lectura anterior y el monto')
    setConfirming(true)
    try {
      await api.post('/readings/confirm-ocr', {
        meterImageId: ocrResult.meterImageId, idRecibo: selectedRecibo,
        idDepartamento: selectedDepto, lecturaFinal: parseFloat(lecturaConfirmada),
        lecturaAnterior: parseFloat(lecturaAnterior), montoCalculado: parseFloat(montoCalculado),
      })
      toast.success('Medición guardada correctamente'); setStep('done')
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Error guardando') }
    finally { setConfirming(false) }
  }

  const confirmarManual = async () => {
    if (!lecturaAnterior || !lecturaConfirmada || !selectedRecibo || !selectedDepto)
      return toast.error('Completa todos los campos')
    const m3 = parseFloat(lecturaConfirmada) - parseFloat(lecturaAnterior)
    if (m3 <= 0) return toast.error('La lectura actual debe ser mayor que la anterior')
    setConfirming(true)
    try {
      await api.post('/readings/confirm-ocr', {
        meterImageId: null, idRecibo: selectedRecibo, idDepartamento: selectedDepto,
        lecturaFinal: parseFloat(lecturaConfirmada), lecturaAnterior: parseFloat(lecturaAnterior),
        montoCalculado: parseFloat(montoCalculado || '0'),
      })
      toast.success('Medición guardada correctamente'); setStep('done')
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Error guardando') }
    finally { setConfirming(false) }
  }

  const reset = () => {
    setStep('upload'); setImageFile(null); setOriginalFile(null); setImagePreview('')
    setOcrResult(null); setLecturaConfirmada(''); setLecturaAnterior(''); setLecturaAnteriorAuto(false)
    setMontoCalculado(''); setSelectedDepto(''); setShowEditor(false); setImageFueEditada(false)
    setMedicionExistente(null); setModoManual(false); setSelectedServicio(''); setSvcsConMedicion([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const recibo      = receipts.find((r: any) => r.id === selectedRecibo)
  const consumido   = lecturaConfirmada && lecturaAnterior
    ? (parseFloat(lecturaConfirmada) - parseFloat(lecturaAnterior)).toFixed(3) : '—'

  return (
    <div style={{ padding:'2rem', maxWidth:820, margin:'0 auto' }}>
      <div style={{ marginBottom:'1.5rem' }} className="fade-up">
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>Nueva Medición</h1>
        <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Registro de lectura de medidor por departamento</p>
      </div>

      {/* Steps */}
      <div style={{ display:'flex',alignItems:'center',marginBottom:'2rem' }} className="fade-up">
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:'flex',alignItems:'center',gap:'0.5rem',flex:1 }}>
            <div style={{ width:28,height:28,borderRadius:'50%',border:`2px solid ${step===s?'var(--accent)':STEPS.indexOf(step)>i?'var(--green)':'var(--border)'}`,background:step===s?'var(--accent)':STEPS.indexOf(step)>i?'var(--green)':'var(--bg-elevated)',color:step===s?'#0f1117':STEPS.indexOf(step)>i?'var(--green)':'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:700,flexShrink:0,transition:'all 0.3s' }}>
              {STEPS.indexOf(step)>i?'✓':i+1}
            </div>
            <span style={{ fontSize:'0.75rem',color:step===s?'var(--accent)':'var(--text-muted)' }}>{STEP_LABELS[i]}</span>
            {i<3 && <div style={{ flex:1,height:1,background:'var(--border)',margin:'0 0.4rem' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Período */}
      {step === 'periodo' && (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.75rem' }} className="fade-up">
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700,marginBottom:'0.5rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
            <Droplets size={18} color="var(--blue)" /> Seleccionar período
          </h2>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem',marginBottom:'1.5rem' }}>Verifica que los recibos del mes estén cargados antes de continuar.</p>
          <div style={{ display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1.25rem' }}>
            <Field label="Edificio">
              <select value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
                <option value="">Seleccionar...</option>
                {buildings.map((b:any) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </Field>
            <Field label="Mes">
              <select value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                {MESES_CORTO.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Año">
              <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}>
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>

          {validation && !validation.listo && (
            <div style={{ display:'flex',gap:'0.75rem',background:'rgba(245,166,35,0.08)',border:'1px solid rgba(245,166,35,0.2)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1.25rem' }}>
              <AlertTriangle size={16} color="var(--accent)" style={{ flexShrink:0,marginTop:2 }} />
              <div>
                <p style={{ fontWeight:600,marginBottom:'0.3rem',fontSize:'0.875rem' }}>Recibos faltantes para {MESES_CORTO[mes]} {anio}</p>
                {validation.serviciosFaltantes.map((s:string) => (
                  <p key={s} style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>· {s.toUpperCase()} — no registrado</p>
                ))}
                <p style={{ fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.5rem' }}>Ve a <strong>Recibos del Mes</strong> y carga los costos antes de continuar.</p>
              </div>
            </div>
          )}

          <button onClick={validatePeriod} style={btn}>Verificar período <ArrowRight size={15} /></button>

          {/* Selector de servicio cuando hay múltiples */}
          {validation?.seleccionarServicio && (
            <div style={{ marginTop:'1rem',background:'rgba(62,207,142,0.07)',border:'1px solid rgba(62,207,142,0.25)',borderRadius:'var(--radius)',padding:'1.25rem' }}>
              <p style={{ fontWeight:600,color:'var(--green)',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
                ✅ Período completo — selecciona el servicio a medir
              </p>
              <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:'1rem' }}>
                Este edificio tiene {svcsConMedicion.length} servicios con medición individual. Elige cuál vas a registrar ahora.
              </p>
              <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem',marginBottom:'1rem' }}>
                {svcsConMedicion.map((svc:any) => {
                  const isSelected = selectedServicio === svc.id
                  const cfg = TIPO_SERVICIO_CFG[svc.tipo] || TIPO_SERVICIO_CFG['agua']
                  const tipoLabel = `${cfg.emoji} ${cfg.label}`
                  const unidadSvc = getUnidadLabel(svc.unidadMedida)
                  return (
                    <div key={svc.id} onClick={() => handleServicioChange(svc.id)}
                      style={{ display:'flex',alignItems:'center',gap:'0.75rem',cursor:'pointer',
                        background: isSelected ? 'rgba(62,207,142,0.1)' : 'var(--bg-elevated)',
                        border:`1px solid ${isSelected ? 'rgba(62,207,142,0.4)' : 'var(--border)'}`,
                        borderRadius:'var(--radius)',padding:'0.75rem 1rem',transition:'all 0.15s',userSelect:'none' }}>
                      <div style={{ width:18,height:18,borderRadius:'50%',border:`2px solid ${isSelected?'var(--green)':'var(--border)'}`,
                        background:isSelected?'var(--green)':'transparent',flexShrink:0,display:'flex',
                        alignItems:'center',justifyContent:'center',transition:'all 0.15s' }}>
                        {isSelected && <div style={{ width:7,height:7,borderRadius:'50%',background:'#0f1117' }} />}
                      </div>
                      <div>
                        <p style={{ fontWeight:600,fontSize:'0.9rem',color:isSelected?'var(--green)':'var(--text-primary)',margin:0 }}>
                          {tipoLabel} — {svc.nombre}
                        </p>
                        <p style={{ fontSize:'0.75rem',color:'var(--text-muted)',margin:0 }}>
                          Unidad: {unidadSvc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setStep('upload')} disabled={!selectedServicio}
                style={{ ...btn, opacity: selectedServicio ? 1 : 0.5 }}>
                Continuar con medición <ArrowRight size={15} />
              </button>
            </div>
          )}

          {validation?.sinMedicion && (
            <div style={{ marginTop:'1rem',background:'rgba(74,158,255,0.08)',border:'1px solid rgba(74,158,255,0.25)',borderRadius:'var(--radius)',padding:'1rem 1.25rem',display:'flex',alignItems:'flex-start',gap:'0.75rem' }}>
              <span style={{ fontSize:'1.2rem',flexShrink:0 }}>ℹ️</span>
              <div>
                <p style={{ fontWeight:600,color:'var(--blue)',marginBottom:'0.3rem' }}>Sin servicios de medición individual</p>
                <p style={{ fontSize:'0.85rem',color:'var(--text-secondary)',lineHeight:1.5 }}>
                  Este edificio no tiene servicios configurados con modo <strong>por consumo</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.75rem' }} className="fade-up">
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700,marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
            <Camera size={18} color="var(--accent)" /> Fotografiar medidor
            {svcActivo && (
              <span style={{ fontSize:'0.8rem',fontWeight:400,color:'var(--text-muted)',marginLeft:'0.5rem' }}>
                ({svcCfg.emoji} {svcCfg.label} — {unidad})
              </span>
            )}
          </h2>

          <div style={{ display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1.25rem' }}>
            <Field label="Departamento">
              <select value={selectedDepto} onChange={e => setSelectedDepto(e.target.value)}>
                <option value="">Seleccionar...</option>
                {depts.map((d:any) => <option key={d.id} value={d.id}>Depto {d.nrDepartamento}</option>)}
              </select>
            </Field>
            {/* Label dinámico según el tipo de servicio */}
            <Field label={labelRecibo}>
              <select value={selectedRecibo} onChange={e => setSelectedRecibo(e.target.value)}>
                {receipts.map((r:any) => {
                  const monto      = parseFloat(r.montoTotalFactura||0).toFixed(2)
                  const consumoFac = parseFloat(r.m3LecturaActual||r.m3ConsumoTotal||0)
                  const precio     = parseFloat(r.precioM3||0)
                  return (
                    <option key={r.id} value={r.id}>
                      {MESES_CORTO[r.periodoMes]} {r.periodoAnio} — S/. {monto}
                      {consumoFac>0?` — ${consumoFac.toFixed(3)} ${unidad}`:''} — S/. {precio.toFixed(4)}/{unidad}
                    </option>
                  )
                })}
              </select>
            </Field>
          </div>

          {selectedDepto && lecturaAnteriorAuto && (
            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'rgba(62,207,142,0.07)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:'var(--radius)',padding:'0.6rem 0.9rem',marginBottom:'1rem' }}>
              <CheckCircle2 size={14} color="var(--green)" />
              <p style={{ fontSize:'0.8rem',color:'var(--green)' }}>
                Lectura anterior cargada: <strong style={{ fontFamily:'monospace' }}>{lecturaAnterior} {unidad}</strong>
                <span style={{ color:'var(--text-muted)',fontWeight:400 }}> — puedes corregirla en el siguiente paso</span>
              </p>
            </div>
          )}
          {selectedDepto && !lecturaAnteriorAuto && (
            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.6rem 0.9rem',marginBottom:'1rem' }}>
              <AlertTriangle size={14} color="var(--text-muted)" />
              <p style={{ fontSize:'0.8rem',color:'var(--text-muted)' }}>Sin historial previo — ingresa la lectura anterior manualmente en el siguiente paso</p>
            </div>
          )}

          {medicionExistente && (
            <div style={{ background:'rgba(167,139,250,0.07)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:'var(--radius)',padding:'0.9rem 1.1rem',marginBottom:'1rem' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:'1rem',flexWrap:'wrap' }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontWeight:600,fontSize:'0.875rem',color:'#a78bfa',marginBottom:'0.3rem' }}>
                    ⚠️ Ya existe una medición para este departamento en este período
                  </p>
                  <div style={{ display:'flex',gap:'1.5rem',flexWrap:'wrap',fontSize:'0.82rem',color:'var(--text-secondary)' }}>
                    {medicionExistente.lecturaActual != null && (
                      <span>Lectura: <strong style={{ fontFamily:'monospace',color:'var(--text-primary)' }}>{medicionExistente.lecturaActual} {unidad}</strong></span>
                    )}
                    {medicionExistente.lecturaAnterior != null && (
                      <span>Anterior: <strong style={{ fontFamily:'monospace' }}>{medicionExistente.lecturaAnterior} {unidad}</strong></span>
                    )}
                    {medicionExistente.montoCalculado != null && (
                      <span>Monto: <strong style={{ color:'var(--accent)' }}>S/. {parseFloat(medicionExistente.montoCalculado).toFixed(2)}</strong></span>
                    )}
                  </div>
                </div>
                {medicionExistente.idMeterImage && (
                  <MeterImageThumb meterImageId={medicionExistente.idMeterImage} apiBase={API_BASE} />
                )}
              </div>
            </div>
          )}

          {/* Toggle modo manual */}
          <div onClick={() => setModoManual(m => !m)}
            style={{ display:'flex',alignItems:'center',gap:'0.6rem',cursor:'pointer',
              background: modoManual ? 'rgba(245,166,35,0.07)' : 'var(--bg-elevated)',
              border:`1px solid ${modoManual ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
              borderRadius:'var(--radius)',padding:'0.65rem 0.9rem',marginBottom:'1.25rem',userSelect:'none',transition:'all 0.2s' }}>
            <div style={{ width:18,height:18,borderRadius:4,border:`2px solid ${modoManual?'var(--accent)':'var(--border)'}`,
              background:modoManual?'var(--accent)':'transparent',display:'flex',alignItems:'center',
              justifyContent:'center',flexShrink:0,transition:'all 0.15s' }}>
              {modoManual && <span style={{ color:'#0f1117',fontSize:12,fontWeight:900,lineHeight:1 }}>✓</span>}
            </div>
            <div>
              <p style={{ fontWeight:600,fontSize:'0.875rem',color:modoManual?'var(--accent)':'var(--text-primary)',margin:0 }}>
                Ingresar lectura manualmente (sin foto)
              </p>
              <p style={{ fontSize:'0.75rem',color:'var(--text-muted)',margin:0 }}>
                Para cuando el administrador registra la lectura directamente sin fotografiar el medidor
              </p>
            </div>
          </div>

          {/* Formulario manual */}
          {modoManual ? (
            <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'1.25rem',marginBottom:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem' }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
                <Field label={`Lectura anterior (${unidad}) *`}>
                  <input type="number" step="0.001" min="0" value={lecturaAnterior}
                    onChange={e => setLecturaAnterior(e.target.value)}
                    placeholder="Ej: 120.456" style={{ fontFamily:'monospace',fontSize:'1rem' }} />
                </Field>
                <Field label={`Lectura actual (${unidad}) *`}>
                  <input type="number" step="0.001" min="0" value={lecturaConfirmada}
                    onChange={e => setLecturaConfirmada(e.target.value)}
                    placeholder="Ej: 135.821" style={{ fontFamily:'monospace',fontSize:'1rem' }} />
                </Field>
              </div>
              {lecturaAnterior && lecturaConfirmada && parseFloat(lecturaConfirmada) > parseFloat(lecturaAnterior) && (
                <div style={{ background:'var(--bg-surface)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',display:'flex',justifyContent:'space-between',fontSize:'0.875rem' }}>
                  <span style={{ color:'var(--text-secondary)' }}>{unidad} consumidos</span>
                  <strong style={{ color:'var(--blue)',fontFamily:'monospace' }}>
                    {(parseFloat(lecturaConfirmada) - parseFloat(lecturaAnterior)).toFixed(3)} {unidad}
                  </strong>
                </div>
              )}
              {lecturaAnterior && lecturaConfirmada && parseFloat(lecturaConfirmada) <= parseFloat(lecturaAnterior) && (
                <p style={{ fontSize:'0.8rem',color:'#f87171' }}>⚠️ La lectura actual debe ser mayor que la anterior</p>
              )}
              {montoCalculado && parseFloat(montoCalculado) > 0 && (
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.9rem',borderTop:'1px solid var(--border)',paddingTop:'0.75rem' }}>
                  <span style={{ color:'var(--text-secondary)',fontWeight:600 }}>Monto estimado</span>
                  <strong style={{ color:'var(--accent)',fontSize:'1.1rem' }}>S/. {montoCalculado}</strong>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                style={{ border:`2px dashed ${imagePreview?'var(--accent)':'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'2.5rem 1.5rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.75rem',cursor:'pointer',background:'var(--bg-elevated)',minHeight:180,marginBottom:'0.75rem',transition:'border-color 0.2s' }}
                onClick={() => fileRef.current?.click()}>
                {imagePreview ? (
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem' }}>
                    <img src={imagePreview} alt="Medidor" style={{ maxHeight:180,maxWidth:'100%',objectFit:'contain',borderRadius:8,border:'1px solid var(--border)' }} />
                    <p style={{ fontSize:'0.8rem',color:'var(--text-secondary)' }}>{originalFile?.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload size={28} color="var(--text-muted)" />
                    <p style={{ color:'var(--text-secondary)',fontWeight:500 }}>Arrastra la foto o haz clic para seleccionar</p>
                    <p style={{ fontSize:'0.8rem',color:'var(--text-muted)' }}>JPG, PNG — máx. 10MB</p>
                  </>
                )}
              </div>
              {imageFile && (
                <div style={{ display:'flex',gap:'0.5rem',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap' }}>
                  {imageFueEditada ? (
                    <span style={{ fontSize:'0.75rem',color:'var(--accent)',background:'var(--accent-dim)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:4,padding:'0.2rem 0.6rem' }}>
                      ✂️ Imagen ajustada
                    </span>
                  ) : (
                    <span style={{ fontSize:'0.75rem',color:'var(--green)',background:'var(--green-dim)',border:'1px solid rgba(62,207,142,0.3)',borderRadius:4,padding:'0.2rem 0.6rem' }}>
                      ✓ Imagen lista
                    </span>
                  )}
                  <button onClick={e => { e.stopPropagation(); setShowEditor(true) }}
                    style={{ fontSize:'0.75rem',color:'var(--text-secondary)',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.6rem',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                    ✏️ Volver a ajustar
                  </button>
                </div>
              )}
            </>
          )}

          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display:'none' }} />

          <div style={{ display:'flex',gap:'0.75rem' }}>
            <button onClick={() => setStep('periodo')} style={btn2}>← Atrás</button>
            {modoManual ? (
              <button onClick={confirmarManual}
                disabled={!selectedDepto || !lecturaAnterior || !lecturaConfirmada || confirming || parseFloat(lecturaConfirmada) <= parseFloat(lecturaAnterior)}
                style={{ ...btn, opacity: (!selectedDepto || !lecturaAnterior || !lecturaConfirmada) ? 0.5 : 1 }}>
                {confirming
                  ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando...</>
                  : <><CheckCircle2 size={15} /> Guardar medición</>}
              </button>
            ) : (
              <button onClick={uploadOcr} disabled={!imageFile||!selectedDepto||uploading}
                style={{ ...btn, opacity:!imageFile||!selectedDepto?0.5:1 }}>
                {uploading
                  ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Procesando OCR...</>
                  : <><Camera size={15} /> Leer medidor automáticamente</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmar */}
      {step === 'confirm' && ocrResult && (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.75rem' }} className="fade-up">
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700,marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
            <CheckCircle2 size={18} color={ocrResult.ocrResult.usedRed?'var(--accent)':'var(--green)'} /> Confirmar lectura
          </h2>
          {ocrResult.ocrResult.usedRed && (
            <div style={{ display:'flex',gap:'0.75rem',background:'var(--accent-dim)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1.25rem' }}>
              <AlertTriangle size={16} color="var(--accent)" />
              <p style={{ fontSize:'0.875rem' }}>Dígitos no legibles — se usó fallback .999. Verifica y corrige la lectura.</p>
            </div>
          )}

          <div style={{ display:'flex',gap:'1.5rem',alignItems:'center',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'1rem 1.25rem',marginBottom:'1.25rem',flexWrap:'wrap' }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:'0.75rem',color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:'0.25rem' }}>Lectura OCR</p>
              <p style={{ fontFamily:'monospace',fontSize:'2rem',fontWeight:700,color:'var(--green)',letterSpacing:'0.1em' }}>{ocrResult.ocrResult.rawValue}</p>
              <p style={{ fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:'0.25rem' }}>Confianza: {ocrResult.ocrResult.confidence}%</p>
            </div>
            {imagePreview && (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem' }}>
                <img src={imagePreview} alt="Medidor" style={{ width:120,height:90,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)' }} />
                <p style={{ fontSize:'0.65rem',color:'var(--text-muted)' }}>Imagen original</p>
              </div>
            )}
          </div>

          <div style={{ display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1.25rem' }}>
            <Field label={`Lectura actual (${unidad}) *`}>
              <input type="number" step="0.001" value={lecturaConfirmada}
                onChange={e => setLecturaConfirmada(e.target.value)}
                style={{ fontFamily:'monospace',fontSize:'1rem' }} />
            </Field>
            <Field label={`Lectura anterior (${unidad}) *`}>
              <input type="number" step="0.001" value={lecturaAnterior}
                onChange={e => { setLecturaAnterior(e.target.value); setLecturaAnteriorAuto(false) }}
                placeholder="Lectura del mes pasado"
                style={{ borderColor: lecturaAnteriorAuto ? 'rgba(62,207,142,0.4)' : undefined }} />
              {lecturaAnteriorAuto && (
                <p style={{ fontSize:'0.7rem',color:'var(--green)',marginTop:'0.25rem',display:'flex',alignItems:'center',gap:'0.25rem' }}>
                  <CheckCircle2 size={10} /> Cargada automáticamente
                </p>
              )}
            </Field>
          </div>

          <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'0.5rem',marginBottom:'1.25rem' }}>
            {[
              [`${unidad} consumidos`, `${consumido} ${unidad}`, 'var(--blue)'],
              [`Precio/${unidad}`, `S/. ${recibo ? parseFloat(recibo.precioM3||0).toFixed(4) : '—'}`, ''],
              ['Monto a cobrar', `S/. ${montoCalculado||'—'}`, 'var(--accent)'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display:'flex',justifyContent:'space-between',fontSize:'0.9rem',...(label==='Monto a cobrar'?{borderTop:'1px solid var(--border)',paddingTop:'0.6rem',marginTop:'0.2rem'}:{}) }}>
                <span style={{ color:'var(--text-secondary)',fontWeight:label==='Monto a cobrar'?600:400 }}>{label}</span>
                <span style={{ fontWeight:700,color:color||'var(--text-primary)',fontSize:label==='Monto a cobrar'?'1.1rem':'0.9rem' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display:'flex',gap:'0.75rem' }}>
            <button onClick={reset} style={btn2}><RotateCcw size={14} /> Repetir foto</button>
            <button onClick={confirmOcr} disabled={confirming||!lecturaAnterior} style={btn}>
              {confirming ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={15} />}
              Guardar medición
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.75rem',textAlign:'center' }} className="fade-up">
          <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--green-dim)',border:'1px solid rgba(62,207,142,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem' }}>
            <CheckCircle2 size={32} color="var(--green)" />
          </div>
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.2rem',fontWeight:700,marginBottom:'0.5rem' }}>¡Medición guardada!</h2>
          <p style={{ color:'var(--text-secondary)',marginBottom:'2rem',fontSize:'0.9rem' }}>
            La lectura fue registrada correctamente con {consumido} {unidad} consumidos.
          </p>
          <div style={{ display:'flex',gap:'0.75rem',justifyContent:'center',flexWrap:'wrap' }}>
            <button onClick={reset} style={btn}><Camera size={15} /> Medir otro depto</button>
            <button onClick={() => setStep('periodo')} style={btn2}>Cambiar período</button>
          </div>
        </div>
      )}

      {showEditor && originalFile && (
        <ImageEditorModal file={originalFile} onConfirm={handleEditorConfirm}
          onCancel={() => {
            setShowEditor(false)
            if (!imageFile) { setOriginalFile(null); setImagePreview(''); if (fileRef.current) fileRef.current.value = '' }
          }} />
      )}
    </div>
  )
}

function MeterImageThumb({ meterImageId, apiBase }: { meterImageId: string; apiBase: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    api.get(`/readings/meter-image/${meterImageId}`)
      .then(({ data }) => { if (data?.filename) setSrc(`/uploads/meters/${data.filename}`) })
      .catch(() => {})
  }, [meterImageId])
  if (!src) return null
  return (
    <img src={src} alt="Medición existente"
      style={{ width:90,height:70,objectFit:'cover',borderRadius:6,border:'1px solid rgba(167,139,250,0.4)',flexShrink:0 }}
      onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
  )
}
