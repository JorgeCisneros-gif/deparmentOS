import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { APP_NAME } from '../config/brand'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Bienvenido')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Credenciales incorrectas')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotSent(true)
    toast.success('Si el correo existe, recibirás las instrucciones')
  }

  return (
    <div style={s.root}>
      <div style={s.bgMesh} />
      <div style={s.bgGrid} />
      <div style={s.card} className="fade-up">
        <div style={s.logoWrap}>
          <div style={s.logoIcon}><Building2 size={22} color="var(--accent)" /></div>
          <span style={s.logoText}>{APP_NAME}</span>
        </div>

        {!forgot ? (
          <>
            <h1 style={s.title}>Bienvenido</h1>
            <p style={s.subtitle}>Ingresa a tu cuenta para continuar</p>
            <form onSubmit={handleLogin} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required autoFocus />
              </div>
              <div style={s.field}>
                <label style={s.label}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: '2.8rem' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn}>
                    {showPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setForgot(true)} style={s.forgotLink}>¿Olvidaste tu contraseña?</button>
              <button type="submit" disabled={loading} style={s.btnPrimary}>
                {loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Ingresar'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button onClick={() => { setForgot(false); setForgotSent(false) }} style={s.backBtn}>← Volver</button>
            <h1 style={s.title}>Recuperar acceso</h1>
            <p style={s.subtitle}>Ingresa tu correo y te enviaremos las instrucciones</p>
            {!forgotSent ? (
              <form onSubmit={handleForgot} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Correo electrónico</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@correo.com" required autoFocus />
                </div>
                <button type="submit" style={s.btnPrimary}>Enviar instrucciones</button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--green-dim)', border: '1px solid rgba(62,207,142,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: 'var(--green)' }}>✓</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                  Si el correo <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong> está registrado, recibirás las instrucciones en breve.
                </p>
                <button onClick={() => { setForgot(false); setForgotSent(false) }} style={{ ...s.btnPrimary, marginTop: '0.5rem' }}>Volver al inicio</button>
              </div>
            )}
          </>
        )}
        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {APP_NAME} © {new Date().getFullYear()} — Gestión inteligente de edificios
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' },
  bgMesh: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 20% 80%, rgba(245,166,35,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(74,158,255,0.05) 0%, transparent 60%)', pointerEvents: 'none' },
  bgGrid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: '420px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', position: 'relative', boxShadow: 'var(--shadow-lg)' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' },
  logoIcon: { width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase' },
  eyeBtn: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' },
  forgotLink: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'var(--font-body)', marginTop: '-0.4rem' },
  btnPrimary: { background: 'var(--accent)', color: '#0f1117', fontWeight: 600, fontSize: '0.95rem', padding: '0.75rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'var(--font-body)', marginTop: '0.4rem' },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', fontFamily: 'var(--font-body)' },
}
