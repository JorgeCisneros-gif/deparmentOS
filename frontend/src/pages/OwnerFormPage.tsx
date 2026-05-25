// src/pages/OwnerFormPage.tsx
// Pantalla de creación y edición de propietarios.
// Se monta con la ruta:
//   /owners/new          → Nuevo propietario
//   /owners/:id/edit     → Editar propietario existente
//
// Al montar, carga en orden:
//   1. Edificios disponibles según rol del usuario
//   2. Departamentos del edificio determinado
//   3. Datos del propietario (solo en modo edición)

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth.store'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface Building { id: string; nombre: string }
interface Dept     { id: string; nrDepartamento: string; piso: number }

const BANCOS = ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']
const PAGOS  = ['transferencia', 'yape', 'plin', 'efectivo', 'otro']

const S: Record<string, React.CSSProperties> = {
  btn: {
    display:'flex', alignItems:'center', gap:'0.5rem',
    background:'var(--accent)', color:'#0f1117', fontWeight:600,
    fontSize:'0.875rem', padding:'0.65rem 1.25rem',
    borderRadius:'var(--radius)', border:'none',
    cursor:'pointer', fontFamily:'var(--font-body)',
  },
  btn2: {
    display:'flex', alignItems:'center', gap:'0.5rem',
    background:'var(--bg-elevated)', color:'var(--text-secondary)',
    border:'1px solid var(--border)', fontWeight:500,
    fontSize:'0.875rem', padding:'0.65rem 1.25rem',
    borderRadius:'var(--radius)', cursor:'pointer',
    fontFamily:'var(--font-body)',
  },
  label: {
    fontSize:'0.78rem', fontWeight:600, color:'var(--text-muted)',
    textTransform:'uppercase' as const, letterSpacing:'0.05em',
    display:'block', marginBottom:'0.4rem',
  },
  section: {
    background:'var(--bg-surface)',
    border:'1px solid var(--border)',
    borderRadius:'var(--radius-lg)',
    padding:'1.5rem',
    marginBottom:'1.25rem',
  },
  grid2: {
    display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem',
  },
}

function Field({ label, children, full = false }: {
  label: string; children: React.ReactNode; full?: boolean
}) {
  return (
    <div style={full ? { gridColumn:'span 2' } : {}}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

export default function OwnerFormPage() {
  const navigate      = useNavigate()
  const { id }        = useParams<{ id: string }>()
  const isEdit        = !!id
  const { user, isAdministrador } = useAuthStore()

  // ── Estado del formulario ─────────────────────────────────
  const [nombre,      setNombre]      = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [correo,      setCorreo]      = useState('')
  const [banco,       setBanco]       = useState('')
  const [tipoPago,    setTipoPago]    = useState('transferencia')
  const [status,      setStatus]      = useState('activo')
  const [observacion, setObservacion] = useState('')
  const [idEdificio,  setIdEdificio]  = useState('')
  const [idDepto,     setIdDepto]     = useState('')

  // ── Estado de carga ───────────────────────────────────────
  const [buildings,   setBuildings]   = useState<Building[]>([])
  const [depts,       setDepts]       = useState<Dept[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [loadingD,    setLoadingD]    = useState(false)
  const [saving,      setSaving]      = useState(false)

  // ── Paso 1: cargar edificios al montar ────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingPage(true)
      try {
        // Cargar edificios
        const { data: allBuildings } = await api.get('/buildings')
        const adminId = isAdministrador() ? (user?.idEdificio ?? '') : ''
        const filtered: Building[] = adminId
          ? allBuildings.filter((b: Building) => b.id === adminId)
          : allBuildings

        setBuildings(filtered)

        // Determinar edificio inicial
        // Admin → su edificio; Supervisor → ninguno (elige); Edit → el del propietario
        let edificioInicial = ''
        if (adminId) {
          edificioInicial = adminId
        } else if (filtered.length === 1) {
          edificioInicial = filtered[0].id
        }

        // Paso 2: si es edición, cargar datos del propietario
        if (isEdit) {
          const { data: owner } = await api.get(`/propietarios/${id}`)
          setNombre(owner.nombre     || '')
          setTelefono(owner.telefono  || '')
          setCorreo(owner.correo     || '')
          setBanco(owner.banco       || '')
          setTipoPago(owner.tipo_pago || 'transferencia')
          setStatus(owner.status     || 'activo')
          setObservacion(owner.observacion || '')

          // Edificio del propietario tiene prioridad
          if (owner.edificio_id) edificioInicial = owner.edificio_id

          // Departamento actual del propietario
          const deptoActual = owner.id_departamento || owner.depto_id || ''
          setIdDepto(deptoActual)
        }

        setIdEdificio(edificioInicial)

        // Paso 3: cargar departamentos del edificio determinado
        if (edificioInicial) {
          setLoadingD(true)
          const { data: deptos } = await api.get('/departments', {
            params: { buildingId: edificioInicial },
          })
          setDepts(deptos || [])
          setLoadingD(false)
        }
      } catch (e: any) {
        toast.error('Error cargando datos')
        navigate('/owners')
      } finally {
        setLoadingPage(false)
      }
    }
    init()
  }, [id])

  // ── Paso 3 reactivo: recargar deptos al cambiar edificio ──
  // (solo cuando el usuario cambia el select manualmente)
  const handleEdificioChange = async (bid: string) => {
    setIdEdificio(bid)
    setIdDepto('')   // resetear departamento al cambiar edificio
    setDepts([])
    if (!bid) return
    setLoadingD(true)
    try {
      const { data } = await api.get('/departments', { params: { buildingId: bid } })
      setDepts(data || [])
    } catch { toast.error('Error cargando departamentos') }
    finally { setLoadingD(false) }
  }

  // ── Guardar ───────────────────────────────────────────────
  const save = async () => {
    if (!nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = {
        nombre, telefono:  telefono  || undefined,
        correo: correo    || undefined, banco: banco || undefined,
        tipoPago: tipoPago || undefined,
        observacion: observacion || undefined,
        status,
      }

      if (isEdit) {
        await api.patch(`/propietarios/${id}`, payload)
        if (idDepto) {
          await api.patch(`/departments/${idDepto}`, { idPropietario: id })
        }
        toast.success('Propietario actualizado')
      } else {
        const { data: nuevo } = await api.post('/propietarios', payload)
        if (idDepto) {
          await api.patch(`/departments/${idDepto}`, { idPropietario: nuevo.id })
        }
        toast.success('Propietario creado')
      }
      navigate('/owners')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  // ── Loading screen ────────────────────────────────────────
  if (loadingPage) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:'0.75rem', color:'var(--text-muted)' }}>
        <Loader2 size={24} style={{ animation:'spin 0.8s linear infinite' }} color="var(--accent)" />
        <span>Cargando{isEdit ? ' propietario...' : '...'}</span>
      </div>
    )
  }

  const isAdmin = isAdministrador()

  return (
    <div style={{ padding:'2rem', maxWidth:720, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'2rem' }} className="fade-up">
        <button onClick={() => navigate('/owners')} style={S.btn2}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:700, letterSpacing:'-0.02em' }}>
            {isEdit ? 'Editar propietario' : 'Nuevo propietario'}
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem', marginTop:'0.15rem' }}>
            {isEdit ? 'Modifica los datos del propietario' : 'Completa los datos para registrar un nuevo propietario'}
          </p>
        </div>
      </div>

      {/* ── Sección: Datos personales ─────────────────────── */}
      <div style={S.section} className="fade-up">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:600, marginBottom:'1.25rem', color:'var(--text-primary)' }}>
          Datos personales
        </h2>
        <div style={S.grid2}>
          <Field label="Nombre completo *" full>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              autoFocus
              style={{ width:'100%' }}
            />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <input
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="999888777"
              style={{ width:'100%' }}
            />
          </Field>
          <Field label="Correo electrónico">
            <input
              type="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              placeholder="juan@gmail.com"
              style={{ width:'100%' }}
            />
          </Field>
          <Field label="Observaciones" full>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Notas adicionales (opcional)"
              rows={2}
              style={{ width:'100%', resize:'vertical' }}
            />
          </Field>
        </div>
      </div>

      {/* ── Sección: Departamento ─────────────────────────── */}
      <div style={S.section} className="fade-up">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:600, marginBottom:'0.3rem', color:'var(--text-primary)' }}>
          Asignación de departamento
        </h2>
        <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>
          {isAdmin
            ? 'Selecciona el departamento dentro de tu edificio'
            : 'Selecciona el edificio y luego el departamento del propietario'}
        </p>
        <div style={S.grid2}>
          <Field label="Edificio">
            <select
              value={idEdificio}
              disabled={isAdmin || buildings.length <= 1}
              onChange={e => handleEdificioChange(e.target.value)}
              style={{ width:'100%', opacity: isAdmin ? 0.8 : 1 }}
            >
              <option value="">— Sin asignar —</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            {isAdmin && (
              <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                Edificio asignado a tu cuenta
              </p>
            )}
          </Field>

          <Field label="Departamento">
            {loadingD ? (
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.75rem', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-muted)', fontSize:'0.875rem' }}>
                <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} />
                Cargando departamentos...
              </div>
            ) : (
              <select
                value={idDepto}
                disabled={!idEdificio}
                onChange={e => setIdDepto(e.target.value)}
                style={{ width:'100%' }}
              >
                <option value="">— Sin asignar —</option>
                {depts.map(d => (
                  <option key={d.id} value={d.id}>
                    Depto {d.nrDepartamento} (Piso {d.piso})
                  </option>
                ))}
              </select>
            )}
            {!idEdificio && (
              <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                Primero selecciona un edificio
              </p>
            )}
            {idEdificio && !loadingD && depts.length === 0 && (
              <p style={{ fontSize:'0.73rem', color:'#f87171', marginTop:'0.3rem' }}>
                No hay departamentos disponibles en este edificio
              </p>
            )}
          </Field>
        </div>
      </div>

      {/* ── Sección: Datos de pago ────────────────────────── */}
      <div style={S.section} className="fade-up">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:600, marginBottom:'1.25rem', color:'var(--text-primary)' }}>
          Preferencias de pago
        </h2>
        <div style={S.grid2}>
          <Field label="Banco preferido">
            <select value={banco} onChange={e => setBanco(e.target.value)} style={{ width:'100%' }}>
              <option value="">— Sin especificar —</option>
              {BANCOS.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="Tipo de pago preferido">
            <select value={tipoPago} onChange={e => setTipoPago(e.target.value)} style={{ width:'100%' }}>
              {PAGOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width:'100%' }}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.75rem' }} className="fade-up">
        <button onClick={() => navigate('/owners')} style={S.btn2}>
          Cancelar
        </button>
        <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
          {saving
            ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando...</>
            : <><Save size={15} /> {isEdit ? 'Guardar cambios' : 'Crear propietario'}</>
          }
        </button>
      </div>
    </div>
  )
}
