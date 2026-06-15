'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Icons ───────────────────────────────────────────────────────────────────
function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    </svg>
  )
}
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="m3 7 9 6 9-6"/>
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2"/>
      <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18"/>
      <path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a16.4 16.4 0 0 1-3.2 3.9"/>
      <path d="M6.3 7.6A16.5 16.5 0 0 0 2 12s3.5 6 10 6a10.7 10.7 0 0 0 4.3-.9"/>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  async function handleLogin(e) {
    e?.preventDefault()
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { alert('Error: ' + error.message); setLoading(false) }
    else router.replace('/')
  }

  async function handleRegister(e) {
    e?.preventDefault()
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { alert('Error: ' + error.message) }
    else alert('Cuenta creada. Revisa tu email para confirmar.')
    setLoading(false)
  }

  const isSignIn = mode === 'signin'

  return (
    <div className="screen login">
      <div className="login-card">

        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <IconBook />
          </div>
          <div className="brand-name">Aula</div>
        </div>

        <h1 className="login-title">
          {isSignIn ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
        </h1>
        <p className="login-sub">
          {isSignIn
            ? 'Tu centro de estudio te espera.'
            : 'Empieza a organizar tu semestre.'}
        </p>

        {/* Form */}
        <form className="login-form" onSubmit={isSignIn ? handleLogin : handleRegister}>

          {/* Name field — signup only */}
          {!isSignIn && (
            <div className="field">
              <label className="label" htmlFor="input-name">Nombre</label>
              <div className="input-wrap">
                <span className="input-icon"><IconUser /></span>
                <input
                  type="text"
                  id="input-name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="field">
            <label className="label" htmlFor="input-email">Correo universitario</label>
            <div className="input-wrap">
              <span className="input-icon"><IconMail /></span>
              <input
                type="email"
                id="input-email"
                placeholder="tu.nombre@universidad.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="input-password">Contraseña</label>
              {isSignIn && (
                <a className="link-mini" href="#" onClick={e => e.preventDefault()}>
                  ¿Olvidaste tu contraseña?
                </a>
              )}
            </div>
            <div className="input-wrap">
              <span className="input-icon"><IconLock /></span>
              <input
                type={showPass ? 'text' : 'password'}
                id="input-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                style={{ paddingLeft: '38px' }}
              />
              <button
                type="button"
                className="input-trail"
                onClick={() => setShowPass(s => !s)}
                aria-label="Mostrar contraseña"
              >
                {showPass ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Cargando…' : (isSignIn ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>

          <div className="divider"><span>o</span></div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
            disabled={loading}
          >
            {isSignIn ? 'Crear cuenta nueva' : 'Ya tengo una cuenta'}
          </button>
        </form>

        <p className="legal">
          Al continuar aceptas los{' '}
          <a href="#" onClick={e => e.preventDefault()}>Términos</a> y la{' '}
          <a href="#" onClick={e => e.preventDefault()}>Política de privacidad</a>.
        </p>
      </div>

      {/* Footer */}
      <div className="login-foot">
        <div className="foot-dot" />
        <span>Centro de estudio con IA · v1.0</span>
      </div>
    </div>
  )
}
