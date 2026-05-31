import { useEffect, useState } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
  CheckCircle2, AlertCircle, Loader2, Save, Pencil,
  ChevronLeft, ChevronRight, X, Calendar, Home,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

// ── Tipos ─────────────────────────────────────────────────────

interface Building { id: string; nombre: string }
interface Servicio  { id: string; nombreServicio: string; tipo: string }
interface Recibo {
  id: string; idServicio: string; nroRecibo?: string
  periodoMes: number; periodoAnio: number; montoTotalFactura: number
  m3LecturaActual?: number; m3LecturaAnterior?: number
  m3ConsumoTotal?: number; precioM3?: number; status: string
}
interface ServicioItem {
  tipo: string; servicio: Servicio; recibo: Recibo | null; cargado: boolean
  icon: string; color: string; titulo: string; descripcion: string
}
interface PeriodData {
  periodoMes: number; periodoAnio: number; listo: boolean
  serviciosItems: ServicioItem[]
  // Compatibilidad hacia atrás
  agua: Recibo | null; luz: Recibo | null; internet: Recibo | null
  servicios: Record<string, Servicio | null>
}

// ── Íconos por tipo ───────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
}

const INTERNET_DEFAULT = 30.00

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

// ── Componente principal ──────────────────────────────────────

export default function ReceiptsPage() {
  const [selBuilding, setSelBuilding] = useState('')
  const [mes, setMes]               = useState(new Date().getMonth() + 1)
  const [anio, setAnio]             = useState(new Date().getFullYear())
  const [periodData, setPeriodData] = useState<PeriodData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [modal, setModal]           = useState<string | null>(null) // tipo del servicio
  const [montoModal, setMontoModal]   = useState<any | null>(null)  // item para modal de monto tras alícuotas

  // Estado de fecha de vencimiento de cuotas
  const [vencimiento, setVencimiento]       = useState('')
  const [vencimientoOrig, setVencimientoOrig] = useState('')   // para detectar cambio
  const [vencTotalCuotas, setVencTotalCuotas] = useState(0)
  const [savingVenc, setSavingVenc]           = useState(false)

  useEffect(() => { if (selBuilding) { loadPeriod(); loadVencimiento() } }, [selBuilding, mes, anio])

  const loadVencimiento = async () => {
    try {
      const { data } = await api.get('/fees/period-vencimiento', {
        params: { buildingId: selBuilding, month: mes, year: anio },
      })
      const fecha = data.fechaVencimiento || ''
      setVencimiento(fecha)
      setVencimientoOrig(fecha)
      setVencTotalCuotas(data.totalCuotas || 0)
    } catch { /* silencioso — puede no haber cuotas aún */ }
  }

  const saveVencimiento = async () => {
    if (!vencimiento) return toast.error('Selecciona una fecha de vencimiento')
    setSavingVenc(true)
    try {
      const { data } = await api.patch('/fees/period-vencimiento', {
        buildingId: selBuilding, month: mes, year: anio, fechaVencimiento: vencimiento,
      })
      setVencimientoOrig(vencimiento)
      toast.success(`Vencimiento actualizado en ${data.updated} cuota${data.updated !== 1 ? 's' : ''}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando vencimiento')
    } finally { setSavingVenc(false) }
  }

  const loadPeriod = async () => {
    setLoading(true); setPeriodData(null)
    try {
      const { data } = await api.get('/receipts/period', {
        params: { buildingId: selBuilding, month: mes, year: anio },
      })
      setPeriodData(data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error cargando recibos')
    } finally { setLoading(false) }
  }

  const navMes = (dir: number) => {
    let m = mes + dir, a = anio
    if (m > 12) { m = 1; a++ }; if (m < 1) { m = 12; a-- }
    setMes(m); setAnio(a)
  }

  const activeItem = periodData?.serviciosItems?.find(i => i.tipo === modal)

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader} className="fade-up">
        <div>
          <h1 style={s.title}>Recibos del Mes</h1>
          <p style={s.subtitle}>Ingresa las facturas antes de registrar mediciones</p>
        </div>
      </div>

      {/* Controles */}
      <div style={s.controls} className="fade-up">
        <div style={s.controlGroup}>
          <label style={s.controlLabel}>Edificio</label>
          <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        </div>
        <div style={s.controlGroup}>
          <label style={s.controlLabel}>Período</label>
          <div style={s.mesNav}>
            <button onClick={() => navMes(-1)} style={s.navBtn}><ChevronLeft size={16} /></button>
            <span style={s.mesLabel}>{MESES[mes]} {anio}</span>
            <button onClick={() => navMes(1)} style={s.navBtn}><ChevronRight size={16} /></button>
          </div>
        </div>
        {periodData && (
          <div style={{
            ...s.statusPill,
            background: periodData.listo ? 'var(--green-dim)' : 'var(--accent-dim)',
            borderColor: periodData.listo ? 'rgba(62,207,142,0.3)' : 'rgba(245,166,35,0.3)',
            color: periodData.listo ? 'var(--green)' : 'var(--accent)',
          }}>
            {periodData.listo
              ? <><CheckCircle2 size={14} /> Período completo</>
              : <><AlertCircle size={14} /> Faltan recibos</>}
          </div>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={s.loadingWrap}>
          <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cargando recibos...</span>
        </div>
      ) : periodData ? (
        <>
          {!periodData.listo && (
            <div style={s.alertBanner} className="fade-up">
              <AlertCircle size={16} color="var(--accent)" />
              <div>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Completa los recibos para habilitar las mediciones</p>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  Todos los servicios configurados deben tener su recibo cargado.
                </p>
              </div>
            </div>
          )}

          {/* Tarjetas dinámicas */}
          {!periodData.serviciosItems?.length ? (
            <div style={s.emptyState}>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                Este edificio no tiene servicios activos configurados.<br />
                Ve a <strong>Edificios</strong> para activarlos.
              </p>
            </div>
          ) : (
            <div style={s.cardsGrid} className="fade-up">
              {periodData.serviciosItems.map(item => {
                const IconComp = ICON_MAP[item.icon] || ReceiptText
                return (
                  <ReceiptCard
                    key={item.tipo}
                    tipo={item.tipo}
                    icon={<IconComp size={22} color={item.color} />}
                    color={item.color}
                    titulo={item.titulo}
                    descripcion={item.descripcion}
                    recibo={item.recibo}
                    servicio={item.servicio}
                    onEdit={() => setModal(item.tipo)}
                  />
                )
              })}
            </div>
          )}

          {periodData.listo && <PeriodSummary data={periodData} mes={mes} anio={anio} />}

          {/* Sección fecha de vencimiento de cuotas */}
          <VencimientoSection
            vencimiento={vencimiento}
            vencimientoOrig={vencimientoOrig}
            totalCuotas={vencTotalCuotas}
            saving={savingVenc}
            onChange={setVencimiento}
            onSave={saveVencimiento}
            mes={mes} anio={anio}
            periodoListo={!!periodData.listo}
          />
        </>
      ) : (
        <div style={s.emptyState}>
          <p style={{ color: 'var(--text-muted)' }}>Selecciona un edificio para ver los recibos</p>
        </div>
      )}

      {/* Modal dinámico según tipo */}
      {modal && activeItem && (
        activeItem.servicio?.modoCalculo === 'por_consumo_ajustado' ? (
          <AjustadoModal
            servicio={activeItem.servicio}
            recibo={activeItem.recibo}
            mes={mes} anio={anio}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); loadPeriod() }}
          />
        ) : activeItem.servicio?.modoCalculo === 'porcentaje_alicuota' ? (
          <AlicuotaModal
            servicio={activeItem.servicio}
            edificioId={selBuilding}
            mes={mes} anio={anio}
            onClose={() => setModal(null)}
            onSaved={() => {
              // Tras guardar alícuotas, pasar al modal de monto total del servicio
              setMontoModal(activeItem)
              setModal(null)
            }}
          />
        ) : activeItem.tipo === 'agua' ? (
          <AguaModal
            servicio={activeItem.servicio} recibo={activeItem.recibo}
            mes={mes} anio={anio}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); loadPeriod() }}
          />
        ) : (
          <GenericModal
            tipo={activeItem.tipo} titulo={activeItem.titulo} color={activeItem.color}
            servicio={activeItem.servicio} recibo={activeItem.recibo}
            mes={mes} anio={anio}
            defaultMonto={activeItem.tipo === 'internet' ? INTERNET_DEFAULT : undefined}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); loadPeriod() }}
          />
        )
      )}

      {/* Modal monto total — se abre automáticamente tras guardar alícuotas */}
      {montoModal && (
        <GenericModal
          tipo={montoModal.tipo} titulo={montoModal.titulo} color={montoModal.color}
          servicio={montoModal.servicio} recibo={montoModal.recibo}
          mes={mes} anio={anio}
          onClose={() => setMontoModal(null)}
          onSaved={() => { setMontoModal(null); loadPeriod() }}
        />
      )}
    </div>
  )
}

// ── Tarjeta de recibo ─────────────────────────────────────────

function ReceiptCard({ tipo, icon, color, titulo, descripcion, recibo, servicio, onEdit }: any) {
  const cargado = !!recibo
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${cargado ? color : 'var(--border)'}` }}>
      <div style={s.cardHeader}>
        <div style={{ ...s.cardIconBox, background: `${color}15`, border: `1px solid ${color}30` }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <h3 style={s.cardTitle}>{titulo}</h3>
          <span style={{ ...s.statusBadge, background: cargado ? `${color}15` : 'var(--bg-elevated)', color: cargado ? color : 'var(--text-muted)', borderColor: cargado ? `${color}40` : 'var(--border)' }}>
            {cargado ? <><CheckCircle2 size={11} /> Cargado</> : <><AlertCircle size={11} /> Pendiente</>}
          </span>
        </div>
      </div>
      <p style={s.cardDesc}>{descripcion}</p>
      {cargado ? (
        <div style={s.reciboData}>
          <div style={s.dataRow}>
            <span style={s.dataLabel}>Monto total</span>
            <span style={{ ...s.dataValue, color }}>S/. {parseFloat(recibo.montoTotalFactura).toFixed(2)}</span>
          </div>
          {recibo.nroRecibo && (
            <div style={s.dataRow}><span style={s.dataLabel}>Nro. recibo</span><span style={s.dataValue}>{recibo.nroRecibo}</span></div>
          )}
          {tipo === 'agua' && recibo.precioM3 && (
            <>
              <div style={s.dataRow}>
                <span style={s.dataLabel}>Consumo total</span>
                <span style={s.dataValue}>{parseFloat(recibo.m3ConsumoTotal||0).toFixed(3)} m³</span>
              </div>
              <div style={s.dataRow}>
                <span style={s.dataLabel}>Precio / m³</span>
                <span style={{ ...s.dataValue, fontWeight: 700 }}>S/. {parseFloat(recibo.precioM3).toFixed(4)}</span>
              </div>
            </>
          )}
          <button onClick={onEdit} style={s.editBtn}><Pencil size={13} /> Modificar</button>
        </div>
      ) : (
        <button onClick={onEdit} disabled={!servicio}
          style={{ ...s.btnCarga, borderColor: color, color, opacity: servicio ? 1 : 0.4 }}>
          {servicio ? `+ Ingresar recibo` : 'Servicio no configurado'}
        </button>
      )}
    </div>
  )
}

// ── Modal Agua ────────────────────────────────────────────────

function AguaModal({ servicio, recibo, mes, anio, onClose, onSaved }: any) {
  const isEdit = !!recibo
  const [nroRecibo, setNroRecibo]   = useState(recibo?.nroRecibo || '')
  const [monto, setMonto]           = useState(recibo?.montoTotalFactura?.toString() || '')
  const [m3Factura, setM3Factura]   = useState(recibo?.m3ConsumoTotal?.toString() || recibo?.m3LecturaActual?.toString() || '')
  const [fechaEmision, setFechaEmision]         = useState(recibo?.fechaEmision || '')
  const [fechaVencimiento, setFechaVencimiento] = useState(recibo?.fechaVencimiento || '')
  const [saving, setSaving] = useState(false)

  const precioM3 = m3Factura && monto && parseFloat(m3Factura) > 0
    ? parseFloat(monto) / parseFloat(m3Factura) : 0

  const save = async () => {
    if (!monto || !m3Factura) return toast.error('Completa el monto y los m³')
    if (parseFloat(m3Factura) <= 0) return toast.error('Los m³ deben ser mayor a cero')
    setSaving(true)
    try {
      const payload: any = {
        idServicio: servicio.id, periodoMes: mes, periodoAnio: anio,
        nroRecibo: nroRecibo || undefined,
        montoTotalFactura: parseFloat(monto),
        m3LecturaActual: parseFloat(m3Factura), m3LecturaAnterior: 0,
        fechaEmision: fechaEmision || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
      }
      isEdit ? await api.patch(`/receipts/${recibo.id}`, payload) : await api.post('/receipts', payload)
      toast.success(isEdit ? 'Recibo actualizado' : 'Recibo registrado')
      onSaved()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  return (
    <Modal titulo={`Recibo — ${servicio?.nombreServicio || 'Agua'}`} onClose={onClose}>
      <div style={s.modalGrid}>
        <Field label="Nro. de recibo (opcional)" span={2}>
          <input value={nroRecibo} onChange={e => setNroRecibo(e.target.value)} placeholder="Ej: 2999901" />
        </Field>
        <Field label="Monto total (S/.) *">
          <input type="number" step="0.01" min="0" value={monto} onChange={e => setMonto(e.target.value)} placeholder="450.00" autoFocus />
        </Field>
        <Field label="m³ totales según factura *">
          <input type="number" step="0.001" min="0.001" value={m3Factura} onChange={e => setM3Factura(e.target.value)} placeholder="100.000" style={{ fontFamily: 'monospace' }} />
        </Field>
        {monto && m3Factura && parseFloat(m3Factura) > 0 && (
          <div style={{ gridColumn: 'span 2', background: 'var(--blue-dim)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                S/. {parseFloat(monto).toFixed(2)} ÷ {parseFloat(m3Factura).toFixed(3)} m³
              </span>
              <span style={{ fontWeight: 800, color: 'var(--blue)', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
                S/. {precioM3.toFixed(4)}/m³
              </span>
            </div>
          </div>
        )}
        <Field label="Fecha emisión">
          <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} />
        </Field>
        <Field label="Fecha vencimiento">
          <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} isEdit={isEdit} />
    </Modal>
  )
}

// ── Modal Genérico (Luz, Internet, Limpieza, Mantenimiento, Otro) ──

function GenericModal({ tipo, titulo, servicio, recibo, mes, anio, defaultMonto, onClose, onSaved }: any) {
  const isEdit = !!recibo
  const [nroRecibo, setNroRecibo]     = useState(recibo?.nroRecibo || '')
  const [monto, setMonto]             = useState(recibo?.montoTotalFactura?.toString() || defaultMonto?.toString() || '')
  const [fechaVencimiento, setFecha]  = useState(recibo?.fechaVencimiento || '')
  const [proveedor, setProveedor]     = useState(recibo?.proveedor || '')
  const [observacion, setObservacion] = useState(recibo?.observacion || '')
  const [saving, setSaving]           = useState(false)

  const save = async () => {
    if (!monto) return toast.error('Ingresa el monto')
    setSaving(true)
    try {
      const payload: any = {
        idServicio: servicio.id, periodoMes: mes, periodoAnio: anio,
        nroRecibo: nroRecibo || undefined,
        montoTotalFactura: parseFloat(monto),
        fechaVencimiento: fechaVencimiento || undefined,
        ...(proveedor && { proveedor }),
        ...(observacion && { observacion }),
      }
      isEdit ? await api.patch(`/receipts/${recibo.id}`, payload) : await api.post('/receipts', payload)
      toast.success(isEdit ? 'Recibo actualizado' : 'Recibo registrado')
      onSaved()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  return (
    <Modal titulo={`Recibo — ${servicio?.nombreServicio || titulo}`} onClose={onClose}>
      <div style={s.modalGrid}>
        <Field label="Nro. de recibo" span={2}>
          <input value={nroRecibo} onChange={e => setNroRecibo(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Monto total (S/.) *" span={2}>
          <input type="number" step="0.01" min="0" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder={defaultMonto ? defaultMonto.toFixed(2) : '0.00'} autoFocus />
          {defaultMonto && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Valor por defecto: S/. {defaultMonto.toFixed(2)} — modifica si varió
            </p>
          )}
        </Field>
        {tipo === 'limpieza' && (
          <Field label="Proveedor" span={2}>
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Nombre del proveedor (opcional)" />
          </Field>
        )}
        <Field label="Fecha vencimiento" span={2}>
          <input type="date" value={fechaVencimiento} onChange={e => setFecha(e.target.value)} />
        </Field>
        {['limpieza','mantenimiento','otro'].includes(tipo) && (
          <Field label="Observaciones" span={2}>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)}
              rows={2} placeholder="Detalles adicionales (opcional)" style={{ resize: 'vertical' }} />
          </Field>
        )}
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} isEdit={isEdit} />
    </Modal>
  )
}

// ── Sección fecha de vencimiento de cuotas ────────────────────

function VencimientoSection({ vencimiento, vencimientoOrig, totalCuotas, saving, onChange, onSave, mes, anio, periodoListo }: any) {
  const changed  = vencimiento !== vencimientoOrig
  const hasFees  = totalCuotas > 0

  // Formato legible de la fecha
  const fechaTexto = vencimiento
    ? new Date(vencimiento + 'T12:00:00').toLocaleDateString('es-PE', { day:'numeric', month:'long', year:'numeric' })
    : null

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${changed ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.5rem',
      marginTop: '1rem',
      transition: 'border-color 0.2s',
    }} className="fade-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        {/* Título */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Calendar size={16} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:'0.1rem' }}>
              Fecha de vencimiento para residentes
            </p>
            <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
              {hasFees
                ? `Se aplicará a las ${totalCuotas} cuotas de ${MESES[mes]} ${anio}`
                : `Se aplicará al calcular las cuotas de ${MESES[mes]} ${anio}`}
            </p>
          </div>
        </div>

        {/* Input + botón */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
          {/* Fecha actual si ya está guardada */}
          {vencimientoOrig && !changed && (
            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.4rem 0.8rem' }}>
              <CheckCircle2 size={13} color="var(--green)" />
              <span style={{ fontSize:'0.82rem', color:'var(--green)', fontWeight:600 }}>{fechaTexto}</span>
            </div>
          )}

          <input
            type="date"
            value={vencimiento}
            onChange={e => onChange(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${changed ? 'rgba(245,166,35,0.5)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          />

          <button
            onClick={onSave}
            disabled={!vencimiento || saving || (!changed && hasFees)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: changed ? 'var(--accent)' : 'var(--bg-elevated)',
              color: changed ? '#0f1117' : 'var(--text-muted)',
              border: `1px solid ${changed ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: !vencimiento || saving || (!changed && hasFees) ? 'not-allowed' : 'pointer',
              opacity: !vencimiento || (!changed && hasFees) ? 0.5 : 1,
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
          >
            {saving
              ? <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }} />
              : <Save size={13} />
            }
            {hasFees ? (changed ? 'Actualizar cuotas' : 'Sin cambios') : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Nota informativa */}
      {!periodoListo && (
        <div style={{ marginTop:'0.75rem', display:'flex', alignItems:'center', gap:'0.4rem', background:'rgba(245,166,35,0.06)', border:'1px solid rgba(245,166,35,0.15)', borderRadius:6, padding:'0.5rem 0.75rem' }}>
          <AlertCircle size={12} color="var(--accent)" />
          <p style={{ fontSize:'0.75rem', color:'var(--accent)' }}>
            {hasFees
              ? 'Las cuotas del período ya existen — el cambio se aplicará inmediatamente.'
              : 'Completa los recibos y calcula las cuotas desde Cobros para que esta fecha se aplique.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Resumen del período ───────────────────────────────────────

function PeriodSummary({ data, mes, anio }: any) {
  const items  = data.serviciosItems || []
  const total  = items.reduce((sum: number, i: any) => sum + parseFloat(i.recibo?.montoTotalFactura || 0), 0)
  const COLOR_MAP: Record<string, string> = {
    agua:'var(--blue)', luz:'var(--accent)', internet:'var(--green)',
    limpieza:'#a78bfa', mantenimiento:'#fb923c', otro:'#94a3b8',
  }
  return (
    <div style={s.summaryCard} className="fade-up">
      <div style={s.summaryHeader}><CheckCircle2 size={18} color="var(--green)" /><h3 style={{ fontSize:'1rem',fontWeight:600 }}>Resumen — {MESES[mes]} {anio}</h3></div>
      <div style={s.summaryGrid}>
        {items.map((item: any) => (
          <div key={item.tipo} style={s.summaryItem}>
            <span style={{ fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:'0.2rem' }}>{item.titulo.split('—')[0].trim()}</span>
            <span style={{ fontWeight:700,color:COLOR_MAP[item.tipo]||'#94a3b8',fontSize:'1.1rem' }}>S/. {parseFloat(item.recibo?.montoTotalFactura||0).toFixed(2)}</span>
            {item.tipo==='agua'&&item.recibo?.precioM3&&(
              <span style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>S/. {parseFloat(item.recibo.precioM3).toFixed(4)}/m³</span>
            )}
          </div>
        ))}
        <div style={s.summaryTotal}>
          <span style={{ color:'var(--text-secondary)',fontSize:'0.85rem' }}>Total servicios</span>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'1.4rem',fontWeight:700 }}>S/. {total.toFixed(2)}</span>
        </div>
      </div>
      <p style={s.summaryHint}>✅ Todos los recibos cargados. Ya puedes ir a <strong>Nueva Medición</strong> para registrar lecturas.</p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function Modal({ titulo, onClose, children }: any) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{titulo}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>
        <div style={{ padding:'1.5rem',overflowY:'auto',maxHeight:'calc(90vh - 130px)' }}>{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, onSave, saving, isEdit }: any) {
  return (
    <div style={s.modalFooter}>
      <button onClick={onClose} style={s.btnSecondary}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={s.btnPrimary}>
        {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
        {isEdit ? 'Guardar cambios' : 'Registrar recibo'}
      </button>
    </div>
  )
}

function Field({ label, children, span = 1 }: any) {
  return (
    <div style={{ gridColumn:`span ${span}` }}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}


// ── Modal para servicio por_consumo_ajustado ──────────────────
function AjustadoModal({ servicio, recibo, mes, anio, onClose, onSaved }: any) {
  const { fmt } = useTz()
  const API_MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
  const unidad = servicio?.unidadMedida || 'm3'
  const unidadLabel = unidad === 'kwh' ? 'kWh' : 'm³'

  const [form, setForm] = useState({
    nroRecibo:             recibo?.nroRecibo           || '',
    montoTotalFactura:     recibo?.montoTotalFactura    || '',
    totalUnidadesFactura:  recibo?.totalUnidadesFactura || '',
    m3Propios:             recibo?.m3Propios            || '',
    factorAjuste:          recibo?.factorAjuste         || '',
    factorEstado:          recibo?.factorEstado         || 'pendiente',
    proveedor:             recibo?.proveedor            || '',
    fechaVencimiento:      recibo?.fechaVencimiento     || '',
  })
  const [saving, setSaving]       = useState(false)
  const [recalculating, setRecalc] = useState(false)
  const [recalcMsg, setRecalcMsg]  = useState<string | null>(null)

  // Auto-calcular factor cuando cambian totalUnidadesFactura o m3Propios
  useEffect(() => {
    const total = parseFloat(String(form.totalUnidadesFactura))
    const propio = parseFloat(String(form.m3Propios))
    if (total > 0 && propio > 0) {
      const factor = (total / propio).toFixed(8)
      setForm(prev => ({ ...prev, factorAjuste: factor, factorEstado: 'estimado' }))
    }
  }, [form.totalUnidadesFactura, form.m3Propios])

  const recalcular = async () => {
    if (!recibo?.id) return toast.error('Primero guarda el recibo')
    setRecalc(true); setRecalcMsg(null)
    try {
      const { data } = await api.get(`/receipts/recalcular-factor/${recibo.id}`, { params: { save: false } })
      setForm(prev => ({
        ...prev,
        m3Propios:    String(data.sumaM3Mediciones),
        factorAjuste: String(data.factorAjuste || ''),
        factorEstado: data.factorEstado,
      }))
      setRecalcMsg(data.mensaje)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error recalculando') }
    finally { setRecalc(false) }
  }

  const handleSave = async () => {
    if (!form.montoTotalFactura) return toast.error('Ingresa el monto total de la factura')
    if (!form.totalUnidadesFactura) return toast.error(`Ingresa el total de ${unidadLabel} de la factura`)
    setSaving(true)
    try {
      const payload = {
        idServicio:           servicio.id,
        periodoMes:           mes,
        periodoAnio:          anio,
        nroRecibo:            form.nroRecibo || undefined,
        montoTotalFactura:    parseFloat(String(form.montoTotalFactura)),
        totalUnidadesFactura: parseFloat(String(form.totalUnidadesFactura)),
        m3Propios:            form.m3Propios ? parseFloat(String(form.m3Propios)) : undefined,
        factorAjuste:         form.factorAjuste ? parseFloat(String(form.factorAjuste)) : undefined,
        factorEstado:         form.factorAjuste ? (form.factorEstado || 'estimado') : undefined,
        proveedor:            form.proveedor || undefined,
        fechaVencimiento:     form.fechaVencimiento || undefined,
      }
      if (recibo?.id) {
        await api.patch(`/receipts/${recibo.id}`, payload)
      } else {
        await api.post('/receipts', payload)
      }
      toast.success('Recibo guardado')
      onSaved()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  const factorColor = form.factorEstado === 'calculado' ? 'var(--green)'
    : form.factorEstado === 'estimado' ? 'var(--accent)'
    : 'var(--text-muted)'

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Recibo — {servicio?.nombreServicio}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18}/></button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.9rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={s.fieldLabel}>Nro. Recibo</label>
              <input value={form.nroRecibo} onChange={e=>setForm({...form,nroRecibo:e.target.value})} placeholder="Opcional"/>
            </div>
            <div>
              <label style={s.fieldLabel}>Monto total factura (S/.) *</label>
              <input type="number" step="0.01" value={form.montoTotalFactura}
                onChange={e=>setForm({...form,montoTotalFactura:e.target.value})} placeholder="0.00"/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={s.fieldLabel}>Total {unidadLabel} factura * <span style={{ color:'var(--text-muted)',fontWeight:400 }}>(del recibo del proveedor)</span></label>
              <input type="number" step="0.001" value={form.totalUnidadesFactura}
                onChange={e=>setForm({...form,totalUnidadesFactura:e.target.value})} placeholder={`ej: 99.663 ${unidadLabel}`}/>
            </div>
            <div>
              <label style={s.fieldLabel}>{unidadLabel} propios <span style={{ color:'var(--text-muted)',fontWeight:400 }}>(suma mediciones deptos)</span></label>
              <input type="number" step="0.001" value={form.m3Propios}
                onChange={e=>setForm({...form,m3Propios:e.target.value})} placeholder={`ej: 94.190 ${unidadLabel}`}/>
            </div>
          </div>

          {/* Factor de ajuste */}
          <div style={{ background:'var(--bg-elevated)', border:`1px solid ${factorColor}40`, borderRadius:'var(--radius)', padding:'0.9rem 1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
              <label style={{ fontSize:'0.78rem', fontWeight:600, color:factorColor, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>
                Factor de ajuste
                <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', fontWeight:400, color:'var(--text-muted)', textTransform:'none' }}>
                  = {unidadLabel} factura ÷ {unidadLabel} propios
                </span>
              </label>
              <span style={{ fontSize:'0.72rem', color:factorColor, fontWeight:600 }}>
                {form.factorEstado === 'calculado' ? '✓ Calculado desde mediciones'
                  : form.factorEstado === 'estimado' ? '≈ Estimado (editable)'
                  : '⏳ Pendiente de mediciones'}
              </span>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
              <input
                type="number" step="0.00000001"
                value={form.factorAjuste}
                onChange={e=>setForm({...form,factorAjuste:e.target.value,factorEstado:'estimado'})}
                placeholder="Se calcula automáticamente"
                style={{ flex:1, fontFamily:'monospace', color:factorColor }}
              />
              <button onClick={recalcular} disabled={recalculating || !recibo?.id}
                title={!recibo?.id ? 'Guarda el recibo primero para recalcular desde mediciones' : 'Recalcular desde mediciones registradas'}
                style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--bg-surface)', border:`1px solid ${factorColor}60`, borderRadius:'var(--radius)', padding:'0.5rem 0.8rem', cursor:recibo?.id?'pointer':'not-allowed', color:factorColor, fontSize:'0.8rem', fontFamily:'var(--font-body)', opacity:recibo?.id?1:0.5, flexShrink:0 }}>
                {recalculating ? <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/> : '⟳'}
                Recalcular
              </button>
            </div>
            {recalcMsg && (
              <p style={{ fontSize:'0.78rem', color:factorColor, marginTop:'0.4rem' }}>{recalcMsg}</p>
            )}
            {!recibo?.id && (
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.4rem' }}>
                💡 Guarda el recibo primero, luego podrás recalcular desde las mediciones reales.
              </p>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={s.fieldLabel}>Proveedor</label>
              <input value={form.proveedor} onChange={e=>setForm({...form,proveedor:e.target.value})} placeholder="Opcional"/>
            </div>
            <div>
              <label style={s.fieldLabel}>Fecha vencimiento</label>
              <input type="date" value={form.fechaVencimiento} onChange={e=>setForm({...form,fechaVencimiento:e.target.value})}/>
            </div>
          </div>
        </div>

        <div style={s.modalFooter}>
          <button onClick={onClose} style={s.btnSecondary}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={s.btnPrimary}>
            {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
            {recibo?.id ? 'Actualizar recibo' : 'Registrar recibo'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Modal de Alícuotas ────────────────────────────────────────
// Se muestra cuando el servicio tiene modoCalculo = 'porcentaje_alicuota'
// Permite ingresar el % de cada departamento para el período

function AlicuotaModal({ servicio, edificioId, mes, anio, onClose, onSaved }: any) {
  const { fmt } = useTz()
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [lineas, setLineas]   = useState<Record<string, string>>({})

  useEffect(() => {
    api.get('/alicuotas', {
      params: { servicioId: servicio.id, edificioId, month: mes, year: anio }
    }).then(r => {
      setData(r.data)
      // Pre-llenar con valores actuales o el último conocido
      const init: Record<string, string> = {}
      r.data.departamentos.forEach((d: any) => {
        init[d.id] = d.porcentaje != null
          ? String(d.porcentaje)
          : d.ultimoValor != null ? String(d.ultimoValor) : ''
      })
      setLineas(init)
    }).catch(() => toast.error('Error cargando alícuotas'))
    .finally(() => setLoading(false))
  }, [])

  const suma = Object.values(lineas).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const sumaPct = parseFloat(suma.toFixed(4))
  const completo = Math.abs(sumaPct - 100) < 0.01

  const handleSave = async () => {
    setSaving(true)
    try {
      const lineasArr = Object.entries(lineas)
        .filter(([, v]) => v !== '')
        .map(([id, v]) => ({ idDepartamento: id, porcentaje: parseFloat(v) || 0 }))
      await api.post('/alicuotas', { lineas: lineasArr }, {
        params: { servicioId: servicio.id, month: mes, year: anio }
      })
      toast.success(completo ? '✅ Alícuotas guardadas' : '⚠ Guardadas — suma ' + sumaPct + '%')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>% Alícuota — {servicio?.nombreServicio}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18}/></button>
        </div>

        <div style={{ padding: '0.5rem 1.5rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Período: <strong>{MESES[mes]} {anio}</strong> · Ingresa el % de cada departamento. La suma debe ser 100%.
          </p>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '55vh', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={22} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }}/>
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 140px', gap: '0', marginBottom: '0.5rem' }}>
                {['Depto', 'Propietario', '% Alícuota'].map(h => (
                  <div key={h} style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>{h}</div>
                ))}
              </div>

              {data?.departamentos.map((d: any, i: number) => {
                const hasLastVal = d.ultimoValor != null && d.porcentaje == null
                return (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 140px', gap: 0, background: i % 2 !== 0 ? 'rgba(255,255,255,0.02)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ padding: '0.55rem 0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      <Home size={13} style={{ marginRight: 6, opacity: 0.5 }}/> Depto {d.nrDepartamento}
                    </div>
                    <div style={{ padding: '0.55rem 0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.propietario || '—'}
                    </div>
                    <div style={{ padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number" min={0} max={100} step={0.0001}
                        value={lineas[d.id] ?? ''}
                        onChange={e => setLineas({ ...lineas, [d.id]: e.target.value })}
                        placeholder={hasLastVal ? `≈${d.ultimoValor}` : '0.0000'}
                        style={{ width: '80px', padding: '0.3rem 0.4rem', textAlign: 'right', fontSize: '0.85rem',
                          borderColor: hasLastVal ? 'var(--border)' : 'var(--border)' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Suma */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Suma total:</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: completo ? 'var(--green)' : sumaPct > 100 ? '#f87171' : 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {sumaPct.toFixed(4)}%
            </span>
            {completo && <CheckCircle2 size={16} color="var(--green)"/>}
            {sumaPct > 100 && <span style={{ fontSize: '0.78rem', color: '#f87171' }}>⚠ Supera 100%</span>}
          </div>
          <button onClick={() => {
            // Distribuir equitativamente
            const n = data?.departamentos.length || 1
            const pct = (100 / n).toFixed(4)
            const init: Record<string, string> = {}
            data?.departamentos.forEach((d: any) => { init[d.id] = pct })
            setLineas(init)
          }} style={{ fontSize: '0.78rem', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Distribuir equitativamente
          </button>
        </div>

        <div style={s.modalFooter}>
          <button onClick={onClose} style={s.btnSecondary}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || loading} style={s.btnPrimary}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
            Guardar alícuotas
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:         { padding:'2rem',maxWidth:1100,margin:'0 auto' },
  pageHeader:   { marginBottom:'1.5rem' },
  title:        { fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' },
  subtitle:     { color:'var(--text-secondary)',fontSize:'0.875rem' },
  controls:     { display:'flex',alignItems:'flex-end',gap:'1.5rem',marginBottom:'1.75rem',flexWrap:'wrap' },
  controlGroup: { display:'flex',flexDirection:'column',gap:'0.4rem' },
  controlLabel: { fontSize:'0.75rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' },
  select:       { background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.55rem 0.9rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',minWidth:220 },
  mesNav:       { display:'flex',alignItems:'center',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden' },
  navBtn:       { background:'none',border:'none',padding:'0.55rem 0.75rem',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center' },
  mesLabel:     { padding:'0 1rem',fontWeight:600,fontSize:'0.9rem',minWidth:140,textAlign:'center' },
  statusPill:   { display:'flex',alignItems:'center',gap:'0.4rem',border:'1px solid',borderRadius:20,padding:'0.4rem 0.9rem',fontSize:'0.8rem',fontWeight:600,alignSelf:'flex-end' },
  loadingWrap:  { display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'4rem' },
  emptyState:   { display:'flex',justifyContent:'center',padding:'4rem',color:'var(--text-muted)' },
  alertBanner:  { display:'flex',gap:'0.75rem',background:'rgba(245,166,35,0.08)',border:'1px solid rgba(245,166,35,0.25)',borderRadius:'var(--radius)',padding:'1rem 1.25rem',marginBottom:'1.5rem' },
  cardsGrid:    { display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:'1.25rem',marginBottom:'1.5rem' },
  card:         { background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' },
  cardHeader:   { display:'flex',alignItems:'flex-start',gap:'0.9rem' },
  cardIconBox:  { width:48,height:48,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  cardTitle:    { fontSize:'1rem',fontWeight:600,marginBottom:'0.35rem' },
  statusBadge:  { display:'inline-flex',alignItems:'center',gap:'0.3rem',border:'1px solid',borderRadius:20,padding:'0.15rem 0.6rem',fontSize:'0.72rem',fontWeight:600 },
  cardDesc:     { fontSize:'0.825rem',color:'var(--text-secondary)',lineHeight:1.55 },
  reciboData:   { display:'flex',flexDirection:'column',gap:'0.4rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.9rem' },
  dataRow:      { display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.85rem' },
  dataLabel:    { color:'var(--text-secondary)' },
  dataValue:    { fontWeight:600,fontVariantNumeric:'tabular-nums' },
  editBtn:      { display:'flex',alignItems:'center',gap:'0.4rem',background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-secondary)',fontSize:'0.8rem',padding:'0.35rem 0.75rem',cursor:'pointer',fontFamily:'var(--font-body)',marginTop:'0.25rem',alignSelf:'flex-start' },
  btnCarga:     { background:'none',border:'1.5px dashed',borderRadius:'var(--radius)',padding:'0.75rem',fontSize:'0.875rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',width:'100%' },
  summaryCard:  { background:'var(--bg-surface)',border:'1px solid rgba(62,207,142,0.25)',borderRadius:'var(--radius-lg)',padding:'1.5rem' },
  summaryHeader:{ display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'1.25rem' },
  summaryGrid:  { display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:'1rem',marginBottom:'1.25rem' },
  summaryItem:  { display:'flex',flexDirection:'column',gap:'0.2rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.9rem' },
  summaryTotal: { display:'flex',flexDirection:'column',gap:'0.2rem',background:'var(--green-dim)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:'var(--radius)',padding:'0.9rem' },
  summaryHint:  { fontSize:'0.83rem',color:'var(--text-secondary)',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' },
  overlay:      { position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' },
  modal:        { background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:520,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-lg)' },
  modalHeader:  { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)' },
  modalTitle:   { fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700 },
  closeBtn:     { background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' },
  modalGrid:    { display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' },
  modalFooter:  { display:'flex',justifyContent:'flex-end',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)' },
  fieldLabel:   { fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' },
  btnPrimary:   { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.6rem 1.2rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' },
  btnSecondary: { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontWeight:500,fontSize:'0.875rem',padding:'0.6rem 1.2rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' },
}
