// src/pages/PropietarioPagosPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import { useAuthStore } from '../store/auth.store'
import toast from 'react-hot-toast'
import {
  CreditCard, CheckCircle2, Clock, AlertCircle,
  X, Save, Loader2, Upload, Check,
} from 'lucide-react'

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
const TIPOS_PAGO = ['efectivo','transferencia','yape','plin','otro']
const BANCOS     = ['bcp','bbva','interbank','scotiabank','otro']

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:             { label:'Pendiente',           color:'var(--accent)',  bg:'var(--accent-dim)' },
  pendiente_aprobacion:  { label:'En revisión',         color:'#a78bfa',        bg:'rgba(167,139,250,0.1)' },
  parcial:               { label:'Pago parcial',        color:'var(--blue)',    bg:'var(--blue-dim)' },
  pagado:                { label:'Pagado',              color:'var(--green)',   bg:'var(--green-dim)' },
  vencido:               { label:'Vencido',             color:'#f87171',        bg:'rgba(248,113,113,0.1)' },
}

export default function PropietarioPagosPage() {
  const { user } = useAuthStore()
  const [fees, setFees]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagoModal, setPagoModal] = useState<any | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/payments/my-fees')
      // Ordenar: pendientes primero, luego por período desc
      const sorted = (data || []).sort((a: any, b: any) => {
        const aPend = a.statusPago !== 'pagado' ? 0 : 1
        const bPend = b.statusPago !== 'pagado' ? 0 : 1
        if (aPend !== bPend) return aPend - bPend
        if (b.periodoAnio !== a.periodoAnio) return b.periodoAnio - a.periodoAnio
        return b.periodoMes - a.periodoMes
      })
      setFees(sorted)
    } catch { toast.error('Error cargando cuotas') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding:'2rem', maxWidth:900, margin:'0 auto' }}>
      <div style={{ marginBottom:'1.5rem' }} className="fade-up">
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Mis Pagos</h1>
        <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Historial y pagos pendientes de tu departamento</p>
      </div>

      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : fees.length === 0 ? (
        <div style={{ textAlign:'center',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-muted)' }}>
          <CreditCard size={40} style={{ marginBottom:'0.75rem',opacity:0.4 }}/>
          <p>No tienes cuotas registradas</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
          {fees.map(fee => <FeeCard key={fee.id} fee={fee} onPagar={() => setPagoModal(fee)} />)}
        </div>
      )}

      {pagoModal && (
        <PagoModal
          fee={pagoModal}
          onClose={() => setPagoModal(null)}
          onSaved={() => { setPagoModal(null); load() }}
        />
      )}
    </div>
  )
}

// ── Tarjeta de cuota ──────────────────────────────────────────

function FeeCard({ fee, onPagar }: { fee: any; onPagar: () => void }) {
  const cfg     = STATUS_CFG[fee.statusPago] || STATUS_CFG['pendiente']
  const montos  = fee.montosServicios || {}
  const { fmt } = useTz()
  const venc    = fee.fechaVencimiento ? new Date(fee.fechaVencimiento) : null
  const diasRet = venc && fee.statusPago !== 'pagado' ? Math.max(0,Math.floor((Date.now()-venc.getTime())/86400000)) : 0
  const canPay  = fee.mensajeEnviado && !['pagado','pendiente_aprobacion'].includes(fee.statusPago)

  return (
    <div style={{ background:'var(--bg-surface)',border:`1px solid var(--border)`,borderLeft:`3px solid ${cfg.color}`,borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem',flexWrap:'wrap',gap:'0.75rem' }}>
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.25rem' }}>
            <h3 style={{ fontWeight:700,fontSize:'1rem' }}>{MESES[fee.periodoMes]} {fee.periodoAnio}</h3>
            <span style={{ fontSize:'0.75rem',fontWeight:600,color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.color}40`,borderRadius:4,padding:'0.2rem 0.5rem' }}>
              {cfg.label}
            </span>
            {diasRet > 0 && (
              <span style={{ fontSize:'0.72rem',color:'#f87171',fontWeight:600 }}>⚠ {diasRet} días de retraso</span>
            )}
          </div>
          {venc && <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>Vence: {fmt(venc)}</p>}
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:800,fontSize:'1.3rem',color:cfg.color,fontVariantNumeric:'tabular-nums' }}>
            S/. {parseFloat(fee.montoTotal||0).toFixed(2)}
          </p>
          {fee.totalPagado > 0 && fee.statusPago !== 'pagado' && (
            <p style={{ fontSize:'0.78rem',color:'var(--green)' }}>Pagado: S/. {parseFloat(fee.totalPagado).toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Desglose */}
      <div style={{ background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',marginBottom:'1rem',display:'flex',flexWrap:'wrap',gap:'0.5rem 1.5rem' }}>
        {Object.entries(montos).map(([key, item]: [string, any]) => (
          item.monto > 0 && (
            <div key={key} style={{ display:'flex',justifyContent:'space-between',gap:'1rem',fontSize:'0.82rem',minWidth:160 }}>
              <span style={{ color:'var(--text-secondary)' }}>{item.nombre}</span>
              <span style={{ fontVariantNumeric:'tabular-nums' }}>S/. {parseFloat(item.monto).toFixed(2)}</span>
            </div>
          )
        ))}
      </div>

      {/* Historial de pagos de esta cuota */}
      {fee.pagos?.length > 0 && (
        <div style={{ marginBottom:'1rem' }}>
          {fee.pagos.map((p: any) => (
            <div key={p.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.8rem',padding:'0.3rem 0',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ color:'var(--text-muted)' }}>{p.fechaPago} · {p.tipoPago}</span>
              <div style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                {p.estadoPago === 'pendiente_aprobacion' && (
                  <span style={{ fontSize:'0.7rem',color:'#a78bfa',background:'rgba(167,139,250,0.1)',borderRadius:3,padding:'0.1rem 0.4rem' }}>En revisión</span>
                )}
                <span style={{ fontWeight:600,color:'var(--green)',fontVariantNumeric:'tabular-nums' }}>S/. {parseFloat(p.monto).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acción */}
      {!fee.mensajeEnviado ? (
        <p style={{ fontSize:'0.78rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:'0.3rem' }}>
          🔒 El supervisor aún no ha habilitado el pago para este período
        </p>
      ) : fee.statusPago === 'pagado' ? (
        <p style={{ fontSize:'0.82rem',color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center',gap:'0.4rem' }}>
          <CheckCircle2 size={15}/> Cuota pagada
        </p>
      ) : fee.statusPago === 'pendiente_aprobacion' ? (
        <p style={{ fontSize:'0.82rem',color:'#a78bfa',fontWeight:600,display:'flex',alignItems:'center',gap:'0.4rem' }}>
          <Clock size={15}/> Pago enviado, esperando confirmación del supervisor
        </p>
      ) : (
        <button onClick={onPagar} style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:700,fontSize:'0.875rem',padding:'0.6rem 1.25rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
          <CreditCard size={15}/> Registrar pago
        </button>
      )}
    </div>
  )
}

// ── Modal pago propietario ────────────────────────────────────

function PagoModal({ fee, onClose, onSaved }: any) {
  const { today, fmt } = useTz()
  const [form, setForm]             = useState({ fechaPago:today(), monto:String(Math.max(0,(fee.montoTotal||0)-(fee.totalPagado||0))), tipoPago:'transferencia', banco:'', referencia:'', observacion:'' })
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [saving, setSaving]           = useState(false)

  const handleSave = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('Ingresa el monto')
    setSaving(true)
    try {
      const { data: pago } = await api.post('/payments/propietario', {
        idCuota:       fee.id,
        montoCancelado: parseFloat(form.monto),
        tipoPago:      form.tipoPago,
        banco:         form.banco || undefined,
        referencia:    form.referencia || undefined,
        observacion:   form.observacion || undefined,
        fechaPago:     form.fechaPago,
      })
      // Subir comprobante si lo hay
      if (comprobante && pago?.id) {
        const base64 = await new Promise<string>((res,rej) => {
          const r = new FileReader(); r.onload=()=>res(r.result as string); r.onerror=()=>rej(); r.readAsDataURL(comprobante)
        })
        await api.post(`/payments/${pago.id}/comprobante`, { base64, filename: comprobante.name }).catch(() => {})
      }
      toast.success('Pago enviado — esperando aprobación del supervisor')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error enviando pago')
    } finally { setSaving(false) }
  }

  const saldo = Math.max(0, (fee.montoTotal||0) - (fee.totalPagado||0))

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()} className="fade-up">

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)' }}>
          <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.05rem',fontWeight:700 }}>
            Registrar pago — {MESES[fee.periodoMes]} {fee.periodoAnio}
          </h2>
          <button onClick={onClose} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}><X size={16}/></button>
        </div>

        <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>
          {/* Info */}
          <div style={{ background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' }}>
            <p style={{ fontSize:'0.8rem',color:'#a78bfa',fontWeight:600 }}>⏳ Tu pago quedará en revisión hasta que el supervisor lo apruebe</p>
          </div>

          <div style={{ display:'flex',gap:'0.75rem',flexWrap:'wrap' }}>
            <F label="Fecha de pago *">
              <input type="date" value={form.fechaPago} onChange={e=>setForm({...form,fechaPago:e.target.value})}/>
            </F>
            <F label={`Monto (S/.) * — Saldo: ${saldo.toFixed(2)}`}>
              <input type="number" step="0.01" max={saldo} value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})}/>
            </F>
          </div>

          <div style={{ display:'flex',gap:'0.75rem',flexWrap:'wrap' }}>
            <F label="Tipo de pago">
              <select value={form.tipoPago} onChange={e=>setForm({...form,tipoPago:e.target.value})}>
                {TIPOS_PAGO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </F>
            {form.tipoPago==='transferencia' && (
              <F label="Banco">
                <select value={form.banco} onChange={e=>setForm({...form,banco:e.target.value})}>
                  <option value="">Sin especificar</option>
                  {BANCOS.map(b=><option key={b} value={b}>{b.toUpperCase()}</option>)}
                </select>
              </F>
            )}
          </div>

          <F label="N° de operación / referencia">
            <input value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})} placeholder="Nro. de operación"/>
          </F>

          {/* Comprobante */}
          <div>
            <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' }}>
              Comprobante de pago (imagen)
            </label>
            <label style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.4rem',border:`1.5px dashed ${comprobante?'var(--green)':'var(--border)'}`,borderRadius:'var(--radius)',padding:'1rem',cursor:'pointer',background:comprobante?'rgba(62,207,142,0.05)':'var(--bg-elevated)',transition:'all 0.2s' }}>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setComprobante(e.target.files?.[0]||null)}/>
              {comprobante ? (
                <>
                  <img src={URL.createObjectURL(comprobante)} alt="preview" style={{ maxHeight:100,maxWidth:'100%',objectFit:'contain',borderRadius:4 }}/>
                  <p style={{ fontSize:'0.75rem',color:'var(--green)',fontWeight:600 }}>✓ {comprobante.name}</p>
                </>
              ) : (
                <>
                  <Upload size={20} color="var(--text-muted)"/>
                  <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>Toca para subir comprobante</p>
                  <p style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>JPG, PNG — opcional pero recomendado</p>
                </>
              )}
            </label>
          </div>

          <F label="Observación">
            <textarea style={{ width:'100%',resize:'vertical' as const,minHeight:60 }} value={form.observacion} onChange={e=>setForm({...form,observacion:e.target.value})}/>
          </F>
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)' }}>
          <button onClick={onClose} style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--accent)',color:'#0f1117',fontWeight:700,fontSize:'0.875rem',padding:'0.55rem 1.1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
            {saving?<Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>:<CreditCard size={14}/>}
            Enviar pago
          </button>
        </div>
      </div>
    </div>
  )
}

function F({ label, children }: any) {
  return (
    <div style={{ flex:1,minWidth:180 }}>
      <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}
