'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { getCourses, syncCanvasData } from '@/lib/canvas'

function IconCanvas() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> }
function IconCheck()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }
function IconSave()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconRefresh(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> }
function IconBook()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }

function MateriaToggle({ materia, onToggle }) {
  const activa = materia.activa !== false
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 0',
      borderBottom: '1px solid var(--border-subtle, #f0ede8)',
    }}>
      <button
        onClick={() => onToggle(materia.id, activa)}
        title={activa ? 'Desactivar materia' : 'Activar materia'}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: activa ? 'var(--c-b, #22c55e)' : 'var(--ink-5, #ccc)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
          padding: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: activa ? 20 : 4,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: activa ? 'var(--ink-1)' : 'var(--ink-4)' }}>
          {materia.nombre}
        </div>
        {materia.codigo && (
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{materia.codigo}</div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
        background: activa ? 'var(--c-b-light, #dcfce7)' : 'var(--surface-2, #f5f5f3)',
        color: activa ? '#166534' : 'var(--ink-4)',
        textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
      }}>
        {activa ? 'Activa' : 'Inactiva'}
      </span>
    </div>
  )
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const [user, setUser]         = useState(null)
  const [ready, setReady]       = useState(false)

  // Canvas config
  const [canvasUrl,   setCanvasUrl]   = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [testStatus,  setTestStatus]  = useState(null) // null | 'ok' | 'err'

  // Sync
  const [syncing,    setSyncing]    = useState(false)
  const [syncLog,    setSyncLog]    = useState('')
  const [syncPct,    setSyncPct]    = useState(0)
  const [lastSync,   setLastSync]   = useState(null)

  // Materias activas
  const [materias,        setMaterias]        = useState([])
  const [loadingMaterias, setLoadingMaterias] = useState(false)
  const [togglingId,      setTogglingId]      = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)

      const cached = localStorage.getItem('canvas_config')
      if (cached) {
        const { url, token } = JSON.parse(cached)
        if (url)   setCanvasUrl(url)
        if (token) setCanvasToken(token)
      }

      const { data: cfg } = await supabase
        .from('configuracion_usuario').select('*').eq('user_id', data.session.user.id).single()
      if (cfg) {
        if (cfg.canvas_url)   setCanvasUrl(cfg.canvas_url)
        if (cfg.canvas_token) setCanvasToken(cfg.canvas_token)
        if (cfg.ultima_sync)  setLastSync(cfg.ultima_sync)
      }
      setReady(true)
    })
  }, [router])

  const cargarMaterias = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    setLoadingMaterias(true)
    const { data } = await supabase
      .from('materias').select('id, nombre, codigo, activa, canvas_id')
      .eq('user_id', u.id).order('nombre')
    setMaterias(data ?? [])
    setLoadingMaterias(false)
  }, [])

  useEffect(() => {
    if (ready) cargarMaterias()
  }, [ready, cargarMaterias])

  async function toggleActiva(id, eraActiva) {
    setTogglingId(id)
    setMaterias(prev => prev.map(m => m.id === id ? { ...m, activa: !eraActiva } : m))
    const { error } = await supabase.from('materias').update({ activa: !eraActiva }).eq('id', id)
    if (error) {
      setMaterias(prev => prev.map(m => m.id === id ? { ...m, activa: eraActiva } : m))
      console.error('Error toggleActiva:', error.message)
    }
    setTogglingId(null)
  }

  async function guardarConfig() {
    setSaving(true); setSaved(false)
    const { data: { user: u } } = await supabase.auth.getUser()

    const payload = {
      user_id:      u.id,
      canvas_url:   canvasUrl.trim().replace(/\/$/, ''),
      canvas_token: canvasToken.trim(),
      updated_at:   new Date().toISOString(),
    }

    const { error } = await supabase.from('configuracion_usuario').upsert(payload, { onConflict: 'user_id' })
    if (!error) {
      localStorage.setItem('canvas_config', JSON.stringify({ url: payload.canvas_url, token: payload.canvas_token }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      console.error(error)
      alert('Error guardando configuración: ' + error.message)
    }
    setSaving(false)
  }

  async function probarConexion() {
    setTestStatus(null)
    try {
      const courses = await getCourses(canvasUrl.trim().replace(/\/$/, ''), canvasToken.trim())
      if (Array.isArray(courses) && courses.length >= 0) setTestStatus('ok')
      else setTestStatus('err')
    } catch {
      setTestStatus('err')
    }
  }

  async function sincronizarCanvas() {
    if (!canvasUrl || !canvasToken) {
      alert('Guarda primero la URL y el token de Canvas.')
      return
    }
    setSyncing(true); setSyncLog(''); setSyncPct(0)
    const { data: { user: u } } = await supabase.auth.getUser()

    try {
      const result = await syncCanvasData(canvasUrl, canvasToken, u.id, supabase, {
        onLog:      msg => setSyncLog(prev => prev ? prev + '\n' + msg : msg),
        onProgress: n   => setSyncPct(n),
      })
      setLastSync(result.now)
      cargarMaterias()
    } catch (err) {
      setSyncLog(prev => (prev ? prev + '\n' : '') + '✗ Error: ' + err.message)
    }
    setSyncing(false)
  }

  if (!ready) return null

  const activasCount   = materias.filter(m => m.activa !== false).length
  const inactivasCount = materias.length - activasCount

  return (
    <AppShell user={user}>
      <div className="config-body">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.025em', marginBottom: 6 }}>
            Configuración
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Conecta tu cuenta de Canvas LMS y personaliza la app.</p>
        </div>

        {/* Canvas integration */}
        <div className="config-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <IconCanvas />
            <div className="config-section-title">Canvas LMS</div>
          </div>
          <div className="config-section-sub">
            Conecta tu institución educativa para importar automáticamente cursos, tareas y calificaciones.
            Encuentra tu token en Canvas → Ajustes → Tokens de acceso aprobados.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="label">URL de Canvas</label>
              <div className="input-wrap">
                <input type="url" placeholder="https://miuniversidad.instructure.com"
                  value={canvasUrl} onChange={e => setCanvasUrl(e.target.value)}
                  style={{ paddingLeft: 14 }} />
              </div>
            </div>
            <div className="field">
              <label className="label">API Token</label>
              <div className="input-wrap">
                <input type="password" placeholder="Tu token de acceso personal de Canvas"
                  value={canvasToken} onChange={e => setCanvasToken(e.target.value)}
                  style={{ paddingLeft: 14 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary sm" onClick={guardarConfig} disabled={saving}>
                <IconSave />{saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar'}
              </button>
              <button className="btn btn-ghost sm" onClick={probarConexion} disabled={!canvasUrl || !canvasToken}>
                Probar conexión
              </button>
            </div>

            {testStatus === 'ok' && (
              <div className="config-status">
                <div className="config-status-dot ok" />
                Conexión exitosa con Canvas
              </div>
            )}
            {testStatus === 'err' && (
              <div className="config-status">
                <div className="config-status-dot err" />
                No se pudo conectar. Verifica la URL y el token.
              </div>
            )}
          </div>
        </div>

        {/* Sync */}
        <div className="config-section">
          <div className="config-section-title">Sincronización</div>
          <div className="config-section-sub">
            Importa cursos, tareas y evaluaciones desde Canvas.
            {lastSync && ` Última sync: ${new Date(lastSync).toLocaleString('es-CL')}.`}
          </div>

          <button className="btn btn-primary sm" onClick={sincronizarCanvas} disabled={syncing || !canvasUrl || !canvasToken}>
            <IconRefresh />{syncing ? 'Sincronizando…' : 'Sincronizar con Canvas'}
          </button>

          {(syncing || syncLog) && (
            <div className="sync-progress">
              <div className="sync-bar-track">
                <div className="sync-bar-fill" style={{ width: `${syncPct}%` }} />
              </div>
              <div className="sync-log">{syncLog}</div>
            </div>
          )}
        </div>

        {/* Materias activas */}
        <div className="config-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <IconBook />
            <div className="config-section-title">Materias activas</div>
          </div>
          <div className="config-section-sub" style={{ marginBottom: 16 }}>
            Activa solo las materias que estás cursando actualmente. Las inactivas no aparecen en el
            dashboard ni son analizadas por el motor IA, pero sus datos no se eliminan.
          </div>

          {loadingMaterias ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 40, borderRadius: 8, background: 'var(--surface-2)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : materias.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-4)', padding: '12px 0' }}>
              No hay materias importadas. Sincroniza con Canvas primero.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 10 }}>
                {activasCount} activa{activasCount !== 1 ? 's' : ''}
                {inactivasCount > 0 && ` · ${inactivasCount} inactiva${inactivasCount !== 1 ? 's' : ''}`}
                {' '}— haz clic en el toggle para cambiar
              </div>
              <div style={{ opacity: togglingId ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                {materias.map(m => (
                  <MateriaToggle key={m.id} materia={m} onToggle={toggleActiva} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sobre la app */}
        <div className="config-section">
          <div className="config-section-title">Acerca de Aula</div>
          <div className="config-section-sub" style={{ marginBottom: 0 }}>
            Versión 2.0 — Centro de estudios con IA.<br />
            Hecho con Next.js, Supabase y Gemini AI.
          </div>
        </div>
      </div>
    </AppShell>
  )
}
