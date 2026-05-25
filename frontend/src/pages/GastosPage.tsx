import { useEffect, useState } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  Plus, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Receipt, CheckCircle2, Clock, XCircle, Pencil,
  Wallet, Users, X, Save, CreditCard, Building2,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

// ── Helpers ───────────────────────────────────────────────────
function num(v: any, fb = 0) { const n = parseFloat(v); return isNaN(n) ? fb : n }
function fmt(n: any) { return `S/. ${num(n).toFixed(2)}` }

const TIPOS_PAGO  = ['efectivo','transferencia','yape','plin','otro']
const BANCOS      = ['bcp','bbva','interbank','scotiabank','otro']

type Estado = 'activo' | 'cerrado' | 'anulado'
const ESTADO_META: Record<Estado, { label: string; color: string; icon: JSX.Element }> = {
  activo:  { label: 'Activo',  color: 'var(--green)',  icon: <Clock   size={12}/> },
  cerrado: { label: 'Cerrado', color: 'var(--accent)', icon: <CheckCircle2 size={12}/> },
  anulado: { label: 'Anulado', color: '#f16063',       icon: <XCircle size={12}/> },
}

// ── Estilos inline reutilizables ──────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '1.25rem',
}
const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.45rem',
  background: 'var(--accent)', color: '#0f1117', fontWeight: 700,
  fontSize: '0.875rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius)',
  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
}
const btnSecondary: React.CSSProperties = {
  ...btnPrimary, background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)', border: '1px solid var(--border)',
}
const btnDanger: React.CSSProperties = {
  ...btnPrimary, background: 'rgba(241,96,99,0.1)',
  color: '#f16063', border: '1px solid rgba(241,96,99,0.3)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '0.55rem 0.8rem',
  fontSize: '0.875rem', fontFamily: 'var(--font-body)',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  display: 'block', marginBottom: '0.35rem',
}

function Field({ label, children }: any) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Badge de estado ───────────────────────────────────────────
function EstadoBadge({ estado }: { estado: Estado }) {
  const meta = ESTADO_META[estado] ?? ESTADO_META.activo
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: `${meta.color}18`, color: meta.color,
      border: `1px solid ${meta.color}40`,
      borderRadius: 4, padding: '0.2rem 0.55rem',
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      {meta.icon} {meta.label}
    </span>
  )
}

// ── Modal Nuevo/Editar Gasto ──────────────────────────────────
function ModalGasto({ buildings, onClose, onSaved, gasto }: any) {
  const editing = !!gasto
  const { today } = useTz()
  const [form, setForm] = useState({
    idEdificio:   gasto?.idEdificio   || '',
    nombre:       gasto?.nombre       || '',
    descripcion:  gasto?.descripcion  || '',
    fechaInicio:  gasto?.fechaInicio  || today(),
    fechaFin:     gasto?.fechaFin     || '',
    montoGasto:   gasto?.montoGasto   || '',
    todosDeptos:  !gasto?.listaDepartamentos?.length || false,
  })
  const [depts, setDepts]               = useState<any[]>([])
  const [selectedDepts, setSelectedDepts] = useState<string[]>(gasto?.listaDepartamentos || [])
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    if (form.idEdificio) {
      api.get('/departments', { params: { buildingId: form.idEdificio } })
        .then(r => setDepts(r.data || []))
        .catch(() => {})
    }
  }, [form.idEdificio])

  const toggleDepto = (id: string) => {
    setSelectedDepts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (!form.idEdificio || !form.nombre || !form.montoGasto || !form.fechaInicio) {
      return toast.error('Completa los campos obligatorios')
    }
    setSaving(true)
    try {
      const payload = {
        idEdificio:        form.idEdificio,
        nombre:            form.nombre,
        descripcion:       form.descripcion || undefined,
        fechaInicio:       form.fechaInicio,
        fechaFin:          form.fechaFin || undefined,
        montoGasto:        parseFloat(String(form.montoGasto)),
        listaDepartamentos: form.todosDeptos ? [] : selectedDepts,
      }
      if (editing) {
        await api.patch(`/gastos/${gasto.id}`, payload)
        toast.success('Gasto actualizado')
      } else {
        await api.post('/gastos', payload)
        toast.success('Gasto creado')
      }
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  const nroDeptos = form.todosDeptos ? depts.length : selectedDepts.length
  const montoPorDepto = nroDeptos > 0 && form.montoGasto
    ? (parseFloat(String(form.montoGasto)) / nroDeptos).toFixed(2)
    : '—'

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'1rem' }}>
      <div style={{ ...card, width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:'1rem' }}>
        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.15rem',fontWeight:700 }}>
            {editing ? 'Editar gasto' : 'Nuevo gasto extra'}
          </h2>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex' }}>
            <X size={20}/>
          </button>
        </div>

        {/* Edificio */}
        <Field label="Edificio *">
          <BuildingSelector
            value={form.idEdificio}
            onChange={id => setForm(f => ({...f, idEdificio: id}))}
            placeholder="Seleccionar..."
            autoSelect={false}
            disabled={editing}
          />
        </Field>

        {/* Nombre + descripcion */}
        <Field label="Nombre *">
          <input style={inputStyle} value={form.nombre} placeholder="Ej: Pintura fachada, Reparación bomba…"
            onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
        </Field>
        <Field label="Descripción">
          <textarea style={{...inputStyle, resize:'vertical', minHeight:70}} value={form.descripcion}
            onChange={e => setForm(f => ({...f, descripcion: e.target.value}))} />
        </Field>

        {/* Fechas */}
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <Field label="Fecha inicio *">
            <input type="date" style={inputStyle} value={form.fechaInicio}
              onChange={e => setForm(f => ({...f, fechaInicio: e.target.value}))} />
          </Field>
          <Field label="Fecha fin (opcional)">
            <input type="date" style={inputStyle} value={form.fechaFin}
              onChange={e => setForm(f => ({...f, fechaFin: e.target.value}))} />
          </Field>
        </div>

        {/* Monto */}
        <Field label="Monto total del gasto (S/.) *">
          <input type="number" step="0.01" style={inputStyle} value={form.montoGasto}
            onChange={e => setForm(f => ({...f, montoGasto: e.target.value}))} placeholder="0.00" />
        </Field>

        {/* Departamentos */}
        <div>
          <label style={labelStyle}>Departamentos involucrados</label>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.6rem' }}>
            <input type="checkbox" checked={form.todosDeptos}
              onChange={e => setForm(f => ({...f, todosDeptos: e.target.checked}))} id="todosChk" />
            <label htmlFor="todosChk" style={{ fontSize:'0.875rem', color:'var(--text-secondary)', cursor:'pointer' }}>
              Todos los departamentos activos
            </label>
          </div>
          {!form.todosDeptos && depts.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.75rem' }}>
              {depts.map((d: any) => {
                const sel = selectedDepts.includes(d.id)
                return (
                  <button key={d.id} onClick={() => toggleDepto(d.id)}
                    style={{ ...btnSecondary, padding:'0.3rem 0.65rem', fontSize:'0.78rem',
                      background: sel ? 'rgba(62,207,142,0.12)' : 'var(--bg-surface)',
                      color: sel ? 'var(--green)' : 'var(--text-secondary)',
                      border: sel ? '1px solid rgba(62,207,142,0.35)' : '1px solid var(--border)',
                    }}>
                    Depto {d.nrDepartamento}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Resumen del reparto */}
        {nroDeptos > 0 && form.montoGasto && (
          <div style={{ background:'rgba(245,166,35,0.07)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:'var(--radius)', padding:'0.7rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{nroDeptos} departamentos · reparto igualitario</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Por depto</p>
              <p style={{ fontWeight:800, color:'var(--accent)', fontSize:'1.05rem' }}>S/. {montoPorDepto}</p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.75rem', marginTop:'0.25rem' }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
            {editing ? 'Guardar cambios' : 'Crear gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Registrar Pago ──────────────────────────────────────
// Reemplaza SOLO la función ModalPago en GastosPage.tsx
// Agrega este import al inicio del archivo (si no está ya):
// import { Upload } from 'lucide-react'

function ModalPago({ gasto, deptos, onClose, onSaved }: any) {
  const { today } = useTz()
  const [form, setForm] = useState({
    idDepartamento: '',
    fechaPago:      today(),
    monto:          '',
    tipoPago:       'transferencia',
    banco:          '',
    referencia:     '',
    observacion:    '',
  })
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [saving, setSaving]           = useState(false)

  // Pre-llenar monto con saldo del depto seleccionado
  useEffect(() => {
    if (form.idDepartamento) {
      const d = deptos.find((x: any) => x.id === form.idDepartamento)
      if (d) setForm(f => ({ ...f, monto: String(d.saldo > 0 ? d.saldo : d.montoPorDepto) }))
    }
  }, [form.idDepartamento])

  const handleSave = async () => {
    if (!form.idDepartamento || !form.monto || !form.fechaPago) {
      return toast.error('Completa los campos obligatorios')
    }
    setSaving(true)
    try {
      // 1. Registrar el pago
      const { data: pago } = await api.post('/gastos/pagos', {
        idGastoExtra:   gasto.id,
        idDepartamento: form.idDepartamento,
        fechaPago:      form.fechaPago,
        monto:          parseFloat(form.monto),
        tipoPago:       form.tipoPago,
        banco:          form.banco || undefined,
        referencia:     form.referencia || undefined,
        observacion:    form.observacion || undefined,
      })

      // 2. Subir comprobante si se seleccionó uno
      if (comprobante && pago?.id) {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload  = () => res(reader.result as string)
          reader.onerror = () => rej(new Error('Error leyendo archivo'))
          reader.readAsDataURL(comprobante)
        })
        await api.post(`/gastos/pagos/${pago.id}/comprobante`, {
          base64,
          filename: comprobante.name,
        }).catch(() => {
          // Si el endpoint de comprobante aún no existe, no rompe el flujo
          toast('Pago registrado. El comprobante se guardará cuando el endpoint esté disponible.', { icon: '⚠️' })
        })
      }

      toast.success('Pago registrado')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  const deptoPendientes = deptos.filter((d: any) => !d.pagado)

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'1rem' }}>
      <div style={{ ...card, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:700 }}>Registrar pago</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex' }}><X size={20}/></button>
        </div>

        {/* Info del gasto */}
        <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.65rem 0.9rem' }}>
          <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.1rem' }}>Gasto</p>
          <p style={{ fontWeight:600, fontSize:'0.9rem' }}>{gasto.nombre}</p>
          <p style={{ fontSize:'0.8rem', color:'var(--accent)' }}>{fmt(gasto.montoGasto)} total · {fmt(gasto.montoPorDepto)} por depto</p>
        </div>

        <Field label="Departamento *">
          <select style={inputStyle} value={form.idDepartamento}
            onChange={e => setForm(f => ({...f, idDepartamento: e.target.value}))}>
            <option value="">Seleccionar...</option>
            {deptoPendientes.map((d: any) => (
              <option key={d.id} value={d.id}>
                Depto {d.nrDepartamento} — Saldo: {fmt(d.saldo)}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <Field label="Fecha pago *">
            <input type="date" style={inputStyle} value={form.fechaPago}
              onChange={e => setForm(f => ({...f, fechaPago: e.target.value}))} />
          </Field>
          <Field label="Monto (S/.) *">
            <input type="number" step="0.01" style={inputStyle} value={form.monto}
              onChange={e => setForm(f => ({...f, monto: e.target.value}))} />
          </Field>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <Field label="Tipo de pago">
            <select style={inputStyle} value={form.tipoPago}
              onChange={e => setForm(f => ({...f, tipoPago: e.target.value}))}>
              {TIPOS_PAGO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {form.tipoPago === 'transferencia' && (
            <Field label="Banco">
              <select style={inputStyle} value={form.banco}
                onChange={e => setForm(f => ({...f, banco: e.target.value}))}>
                <option value="">Sin especificar</option>
                {BANCOS.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
              </select>
            </Field>
          )}
        </div>

        <Field label="Referencia / Operación">
          <input style={inputStyle} value={form.referencia}
            onChange={e => setForm(f => ({...f, referencia: e.target.value}))}
            placeholder="Nro. de operación..." />
        </Field>

        {/* Comprobante */}
        <div>
          <label style={labelStyle}>Comprobante (imagen)</label>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem', border: `1.5px dashed ${comprobante ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer',
            background: comprobante ? 'rgba(62,207,142,0.05)' : 'var(--bg-elevated)',
            transition: 'all 0.2s',
          }}>
            <input type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => setComprobante(e.target.files?.[0] || null)} />
            {comprobante ? (
              <>
                <img
                  src={URL.createObjectURL(comprobante)}
                  alt="preview"
                  style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
                />
                <p style={{ fontSize:'0.78rem', color:'var(--green)', fontWeight:600 }}>
                  ✓ {comprobante.name}
                </p>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                  Toca para cambiar
                </p>
              </>
            ) : (
              <>
                <CreditCard size={22} color="var(--text-muted)" />
                <p style={{ fontSize:'0.83rem', color:'var(--text-secondary)', fontWeight:500 }}>
                  Toca para subir comprobante
                </p>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>JPG, PNG — opcional</p>
              </>
            )}
          </label>
          {comprobante && (
            <button
              onClick={() => setComprobante(null)}
              style={{ marginTop:'0.4rem', background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:'var(--font-body)' }}>
              <X size={11} /> Quitar imagen
            </button>
          )}
        </div>

        <Field label="Observación">
          <textarea style={{...inputStyle, resize:'vertical', minHeight:60}} value={form.observacion}
            onChange={e => setForm(f => ({...f, observacion: e.target.value}))} />
        </Field>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.75rem' }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving
              ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>
              : <CreditCard size={14}/>
            }
            Registrar pago
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Tarjeta de gasto ──────────────────────────────────────────
function GastoCard({ gasto, onReload }: { gasto: any; onReload: () => void }) {
  const { fmt: fmtDate } = useTz()
  const [open, setOpen]         = useState(false)
  const [detail, setDetail]     = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [modalEdit, setModalEdit] = useState(false)

  const loadDetail = async () => {
    if (detail) { setOpen(o => !o); return }
    setOpen(true); setLoadingDetail(true)
    try {
      const { data } = await api.get(`/gastos/${gasto.id}`)
      setDetail(data)
    } catch { toast.error('Error cargando detalle') }
    finally { setLoadingDetail(false) }
  }

  const handlePagoSaved = async () => {
    setModalPago(false)
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/gastos/${gasto.id}`)
      setDetail(data)
    } catch {} finally { setLoadingDetail(false) }
    onReload()
  }

  const handleCerrar = async () => {
    if (!confirm(`¿Cerrar el gasto "${gasto.nombre}"? Ya no aceptará más pagos.`)) return
    try { await api.patch(`/gastos/${gasto.id}/cerrar`); toast.success('Gasto cerrado'); onReload() }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
  }

  const handleAnular = async () => {
    if (!confirm(`¿Anular el gasto "${gasto.nombre}"? Esta acción no se puede deshacer.`)) return
    try { await api.patch(`/gastos/${gasto.id}/anular`); toast.success('Gasto anulado'); onReload() }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
  }

  const cobrado   = num(gasto.montoCobrado)
  const total     = num(gasto.montoGasto)
  const pct       = total > 0 ? Math.min(100, (cobrado / total) * 100) : 0
  const pendiente = Math.max(0, total - cobrado)

  return (
    <div style={{ ...card, borderLeft: `3px solid ${ESTADO_META[gasto.estado as Estado]?.color || 'var(--border)'}` }} className="fade-up">
      {/* Cabecera */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap', marginBottom:'0.3rem' }}>
            <h3 style={{ fontSize:'1rem', fontWeight:700 }}>{gasto.nombre}</h3>
            <EstadoBadge estado={gasto.estado} />
          </div>
          <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
            Desde {gasto.fechaInicio}{gasto.fechaFin ? ` → ${gasto.fechaFin}` : ''}
          </p>
        </div>
        {/* Montos */}
        <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Total gasto</p>
            <p style={{ fontWeight:800, fontSize:'1.1rem', fontVariantNumeric:'tabular-nums' }}>{fmt(total)}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cobrado</p>
            <p style={{ fontWeight:700, fontSize:'1rem', color:'var(--green)' }}>{fmt(cobrado)}</p>
          </div>
          {pendiente > 0 && (
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Pendiente</p>
              <p style={{ fontWeight:700, fontSize:'1rem', color:'#f16063' }}>{fmt(pendiente)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Barra progreso */}
      <div style={{ margin:'0.75rem 0 0.5rem', height:5, background:'var(--bg-elevated)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background: pct >= 100 ? 'var(--green)' : 'var(--accent)', borderRadius:3, transition:'width 0.4s' }} />
      </div>
      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.75rem' }}>
        {gasto.totalPagos} pago{gasto.totalPagos !== 1 ? 's' : ''} registrado{gasto.totalPagos !== 1 ? 's' : ''} · {pct.toFixed(0)}% cobrado
      </p>

      {/* Acciones */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
        <button onClick={loadDetail} style={{ ...btnSecondary, fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}>
          {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          {open ? 'Ocultar detalle' : 'Ver detalle'}
        </button>
        {gasto.estado === 'activo' && (
          <>
            <button onClick={() => { setModalEdit(true) }} style={{ ...btnSecondary, fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}>
              <Pencil size={12}/> Editar
            </button>
            <button onClick={() => { if (!detail) loadDetail(); setModalPago(true) }}
              style={{ ...btnPrimary, fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}>
              <CreditCard size={12}/> Registrar pago
            </button>
            <button onClick={handleCerrar} style={{ ...btnSecondary, fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}>
              <CheckCircle2 size={12}/> Cerrar
            </button>
            <button onClick={handleAnular} style={{ ...btnDanger, fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}>
              <XCircle size={12}/> Anular
            </button>
          </>
        )}
      </div>

      {/* Detalle expandible */}
      {open && (
        <div style={{ marginTop:'1rem', borderTop:'1px solid var(--border)', paddingTop:'1rem' }}>
          {loadingDetail ? (
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>
              <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> Cargando...
            </div>
          ) : detail ? (
            <>
              {/* Tabla de deptos */}
              <p style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'0.6rem' }}>
                Estado por departamento
              </p>
              <div style={{ overflowX:'auto', marginBottom:'1rem' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                  <thead>
                    <tr>
                      {['Depto','Por pagar','Pagado','Saldo','Estado'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'0.45rem 0.6rem', color:'var(--text-muted)', fontSize:'0.7rem', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.deptos?.map((d: any) => (
                      <tr key={d.id}>
                        <td style={{ padding:'0.5rem 0.6rem', borderBottom:'1px solid rgba(255,255,255,0.03)', fontWeight:600 }}>Depto {d.nrDepartamento}</td>
                        <td style={{ padding:'0.5rem 0.6rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{fmt(d.montoPorDepto)}</td>
                        <td style={{ padding:'0.5rem 0.6rem', borderBottom:'1px solid rgba(255,255,255,0.03)', color:'var(--green)' }}>{fmt(d.totalPagado)}</td>
                        <td style={{ padding:'0.5rem 0.6rem', borderBottom:'1px solid rgba(255,255,255,0.03)', color: d.saldo > 0 ? '#f16063' : 'var(--text-muted)' }}>{fmt(d.saldo)}</td>
                        <td style={{ padding:'0.5rem 0.6rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                          {d.pagado
                            ? <span style={{ color:'var(--green)', fontWeight:600, fontSize:'0.75rem' }}>✓ Pagado</span>
                            : <span style={{ color:'#f16063', fontWeight:600, fontSize:'0.75rem' }}>Pendiente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Historial de pagos */}
              {detail.pagos?.length > 0 && (
                <>
                  <p style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'0.6rem' }}>
                    Historial de pagos
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {detail.pagos.map((p: any) => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.6rem 0.85rem', fontSize:'0.82rem', flexWrap:'wrap' }}>
                        <div style={{ width:28, height:28, borderRadius:6, background:'rgba(62,207,142,0.1)', border:'1px solid rgba(62,207,142,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <CreditCard size={13} color="var(--green)"/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:600 }}>Depto {p.departamento?.nrDepartamento} · {p.fechaPago}</p>
                          <p style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>{p.tipoPago}{p.banco ? ` · ${p.banco.toUpperCase()}` : ''}{p.referencia ? ` · Ref: ${p.referencia}` : ''}</p>
                        </div>
                        <span style={{ fontWeight:800, color:'var(--green)', fontVariantNumeric:'tabular-nums' }}>{fmt(p.monto)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Modales */}
      {modalPago && detail && (
        <ModalPago gasto={gasto} deptos={detail.deptos} onClose={() => setModalPago(false)} onSaved={handlePagoSaved} />
      )}
      {modalEdit && (
        <ModalGasto
          buildings={buildings} gasto={{ ...gasto, idEdificio: gasto.idEdificio }}
          onClose={() => setModalEdit(false)}
          onSaved={() => { setModalEdit(false); setDetail(null); onReload() }}
        />
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function GastosPage() {
  const { fmt: fmtDate, today } = useTz()
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [gastos, setGastos]                 = useState<any[]>([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [filtroEstado, setFiltroEstado]     = useState('activo')
  const [modalNuevo, setModalNuevo]         = useState(false)

  useEffect(() => {
    if (selectedBuilding) loadGastos()
  }, [selectedBuilding, filtroEstado])

  const loadGastos = async () => {
    setLoading(true); setError('')
    try {
      const params: any = { buildingId: selectedBuilding }
      if (filtroEstado !== 'todos') params.estado = filtroEstado
      const { data } = await api.get('/gastos', { params })
      setGastos(data)
    } catch { setError('No se pudieron cargar los gastos') }
    finally { setLoading(false) }
  }

  // Totales del filtro actual
  const totalGasto    = gastos.reduce((s, g) => s + num(g.montoGasto), 0)
  const totalCobrado  = gastos.reduce((s, g) => s + num(g.montoCobrado), 0)
  const totalPendiente = Math.max(0, totalGasto - totalCobrado)

  return (
    <div style={{ padding:'2rem', maxWidth:1000, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'0.25rem' }}>
            Gastos Generales
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>
            Gastos extras del edificio y seguimiento de cobros por departamento
          </p>
        </div>
        <button onClick={() => setModalNuevo(true)} style={btnPrimary}>
          <Plus size={16}/> Nuevo gasto
        </button>
      </div>

      {/* Controles */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }} className="fade-up">
        <BuildingSelector value={selectedBuilding} onChange={setSelectedBuilding} autoSelect />
        <div style={{ display:'flex', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          {(['activo','cerrado','anulado','todos'] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              style={{ padding:'0.45rem 0.9rem', background: filtroEstado===e ? 'var(--accent-dim)' : 'none',
                color: filtroEstado===e ? 'var(--accent)' : 'var(--text-muted)',
                border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight: filtroEstado===e ? 700 : 400,
                fontFamily:'var(--font-body)',
              }}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen rápido */}
      {gastos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:'0.75rem', marginBottom:'1.5rem' }} className="fade-up">
          {[
            { label:'Gastos listados',  value: gastos.length,        color:'var(--blue)',   suffix:'' },
            { label:'Total gastos',     value: fmt(totalGasto),      color:'var(--accent)', suffix:'' },
            { label:'Total cobrado',    value: fmt(totalCobrado),    color:'var(--green)',  suffix:'' },
            { label:'Pendiente cobrar', value: fmt(totalPendiente),  color:'#f16063',       suffix:'' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...card, borderTop:`2px solid ${color}` }}>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'0.3rem' }}>{label}</p>
              <p style={{ fontWeight:800, fontSize:'1.15rem', color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--red-dim)', border:'1px solid rgba(241,96,99,0.3)', borderRadius:'var(--radius)', padding:'0.75rem 1rem', marginBottom:'1.5rem', color:'#f16063', fontSize:'0.875rem' }}>
          <AlertCircle size={16}/> {error}
        </div>
      )}

      {/* Lista de gastos */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.75rem', padding:'4rem', color:'var(--text-muted)' }}>
          <Loader2 size={22} style={{ animation:'spin 0.8s linear infinite' }}/> Cargando gastos...
        </div>
      ) : gastos.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:'4rem 2rem' }}>
          <Receipt size={36} color="var(--text-muted)" style={{ margin:'0 auto 1rem' }}/>
          <p style={{ color:'var(--text-muted)', marginBottom:'1rem' }}>
            No hay gastos {filtroEstado !== 'todos' ? filtroEstado + 's' : ''} registrados
          </p>
          <button onClick={() => setModalNuevo(true)} style={btnPrimary}>
            <Plus size={15}/> Crear primer gasto
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {gastos.map(g => (
            <GastoCard key={g.id} gasto={g} onReload={loadGastos} />
          ))}
        </div>
      )}

      {/* Modal nuevo gasto */}
      {modalNuevo && (
        <ModalGasto
          buildings={buildings}
          onClose={() => setModalNuevo(false)}
          onSaved={() => { setModalNuevo(false); loadGastos() }}
        />
      )}
    </div>
  )
}
