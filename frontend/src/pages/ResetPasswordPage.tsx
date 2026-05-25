// src/pages/ResetPasswordPage.tsx
// Página PÚBLICA (sin autenticación) — accesible via /reset-password?token=xxx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { APP_NAME } from '../config/brand'

type Estado = 'validando' | 'valido' | 'invalido' | 'guardando' | 'exito' | 'error'

export default function ResetPasswordPage() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token') || ''

  const [estado, setEstado]       = useState<Estado>('validando')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [mensaje, setMensaje]     = useState('')
  const [errores, setErrores]     = useState<string[]>([])

  // Validar token al cargar
  useEffect(() => {
    if (!token) { setEstado('invalido'); return }
    api.get('/users/reset/validate', { params: { token } })
      .then(({ data }) => {
        if (data.valid) { setEmail(data.email || ''); setEstado('valido') }
        else            { setEstado('invalido') }
      })
      .catch(() => setEstado('invalido'))
  }, [token])

  const validar = () => {
    const errs: string[] = []
    if (password.length < 8) errs.push('La contraseña debe tener al menos 8 caracteres')
    if (password !== confirm)  errs.push('Las contraseñas no coinciden')
    if (!/[A-Z]/.test(password)) errs.push('Debe incluir al menos una letra mayúscula')
    if (!/[0-9]/.test(password)) errs.push('Debe incluir al menos un número')
    setErrores(errs)
    return errs.length === 0
  }

  const handleSubmit = async () => {
    if (!validar()) return
    setEstado('guardando')
    try {
      const { data } = await api.post('/users/reset/confirm', { token, newPassword: password })
      setMensaje(data.message)
      setEstado('exito')
    } catch (e: any) {
      setMensaje(e?.response?.data?.message || 'Error actualizando contraseña')
      setEstado('error')
    }
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-app)',padding:'1rem' }}>
      <div style={{ width:'100%',maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center',marginBottom:'2rem' }}>
          <div style={{ width:52,height:52,borderRadius:14,background:'var(--accent-dim)',border:'1px solid rgba(245,166,35,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem' }}>
            <KeyRound size={24} color="var(--accent)"/>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.6rem',fontWeight:800,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>{APP_NAME}</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Restablecer contraseña</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',boxShadow:'var(--shadow-lg)' }}>

          {/* Validando */}
          {estado === 'validando' && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'1rem' }}>
              <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }}/>
              <p style={{ color:'var(--text-secondary)' }}>Verificando enlace...</p>
            </div>
          )}

          {/* Token inválido */}
          {estado === 'invalido' && (
            <div style={{ textAlign:'center' }}>
              <XCircle size={48} color="#f87171" style={{ margin:'0 auto 1rem' }}/>
              <h2 style={{ fontWeight:700,marginBottom:'0.5rem' }}>Enlace inválido o expirado</h2>
              <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem',marginBottom:'1.5rem' }}>
                Este enlace de recuperación ya fue utilizado o ha expirado. Solicita uno nuevo.
              </p>
              <button onClick={() => navigate('/login')}
                style={{ display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.65rem 1.25rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Volver al inicio de sesión
              </button>
            </div>
          )}

          {/* Formulario */}
          {estado === 'valido' && (
            <div style={{ display:'flex',flexDirection:'column',gap:'1.25rem' }}>
              {email && (
                <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.65rem 1rem' }}>
                  <p style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:'0.1rem' }}>Cuenta</p>
                  <p style={{ fontWeight:600,fontSize:'0.875rem' }}>{email}</p>
                </div>
              )}
              <div>
                <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' }}>
                  Nueva contraseña *
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={{ width:'100%',paddingRight:'2.5rem' }}
                    autoFocus
                  />
                  <button onClick={() => setShowPass(p => !p)}
                    style={{ position:'absolute',right:'0.6rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex' }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' }}>
                  Confirmar contraseña *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={{ width:'100%' }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Indicadores de fortaleza */}
              <div style={{ display:'flex',flexDirection:'column',gap:'0.25rem' }}>
                {[
                  [password.length >= 8,         'Al menos 8 caracteres'],
                  [/[A-Z]/.test(password),        'Una letra mayúscula'],
                  [/[0-9]/.test(password),        'Un número'],
                  [password === confirm && !!confirm, 'Las contraseñas coinciden'],
                ].map(([ok, label]) => (
                  <p key={String(label)} style={{ fontSize:'0.75rem',color:ok?'var(--green)':'var(--text-muted)',display:'flex',alignItems:'center',gap:'0.3rem' }}>
                    <span>{ok?'✓':'○'}</span> {String(label)}
                  </p>
                ))}
              </div>

              {/* Errores */}
              {errores.length > 0 && (
                <div style={{ background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' }}>
                  {errores.map(e => <p key={e} style={{ color:'#f87171',fontSize:'0.82rem' }}>· {e}</p>)}
                </div>
              )}

              <button onClick={handleSubmit}
                style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:700,fontSize:'0.9rem',padding:'0.75rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Actualizar contraseña
              </button>
            </div>
          )}

          {/* Guardando */}
          {estado === 'guardando' && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'1rem' }}>
              <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }}/>
              <p style={{ color:'var(--text-secondary)' }}>Actualizando contraseña...</p>
            </div>
          )}

          {/* Éxito */}
          {estado === 'exito' && (
            <div style={{ textAlign:'center' }}>
              <CheckCircle2 size={48} color="var(--green)" style={{ margin:'0 auto 1rem' }}/>
              <h2 style={{ fontWeight:700,marginBottom:'0.5rem' }}>¡Contraseña actualizada!</h2>
              <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem',marginBottom:'1.5rem' }}>{mensaje}</p>
              <button onClick={() => navigate('/login')}
                style={{ display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.65rem 1.25rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Iniciar sesión
              </button>
            </div>
          )}

          {/* Error */}
          {estado === 'error' && (
            <div style={{ textAlign:'center' }}>
              <XCircle size={48} color="#f87171" style={{ margin:'0 auto 1rem' }}/>
              <h2 style={{ fontWeight:700,marginBottom:'0.5rem' }}>Error</h2>
              <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem',marginBottom:'1.5rem' }}>{mensaje}</p>
              <button onClick={() => setEstado('valido')}
                style={{ display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontWeight:600,fontSize:'0.875rem',padding:'0.65rem 1.25rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
