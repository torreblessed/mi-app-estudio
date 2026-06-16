'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { getCourses, getAssignments, assignmentToTarea } from '@/lib/canvas'

function IconCanvas() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> }
function IconCheck()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }
function IconSave()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconRefresh(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> }

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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)

      // Load from localStorage cache first
      const cached = localStorage.getItem('canvas_config')
      if (cached) {
        const { url, token } = JSON.parse(cached)
        if (url)   setCanvasUrl(url)
        if (token) setCanvasToken(token)
      }

      // Then load from Supabase
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

  function log(msg) {
    setSyncLog(prev => prev ? prev + '\n' + msg : msg)
  }

  async function sincronizarCanvas() {
    if (!canvasUrl || !canvasToken) {
      alert('Guarda primero la URL y el token de Canvas.')
      return
    }
    setSyncing(true); setSyncLog(''); setSyncPct(0)
    const { data: { user: u } } = await supabase.auth.getUser()
    const url   = canvasUrl.trim().replace(/\/$/, '')
    const token = canvasToken.trim()

    try {
      log('Obteniendo cursos activos…')
      const courses = await getCourses(url, token)
      const active  = courses.filter(c => !c.access_restricted_by_date)
      log(`Encontré ${active.length} curso(s) activo(s).`)
      setSyncPct(15)

      let totalImported = 0
      for (let i = 0; i < active.length; i++) {
        const course = active[i]
        const materia = course.name
        log(`[${i+1}/${active.length}] ${materia}`)

        // Upsert materia
        await supabase.from('materias').upsert(
          { user_id: u.id, nombre: materia, canvas_id: course.id },
          { onConflict: 'user_id,canvas_id' }
        ).catch(() => {})

        // Get assignments
        try {
          const assignments = await getAssignments(url, token, course.id)
          const futuras = assignments.filter(a => a.due_at && new Date(a.due_at) > new Date(Date.now() - 7*86400000))
          log(`  → ${futuras.length} tareas con fecha`)

          for (const a of futuras) {
            const tarea = assignmentToTarea(a, materia, u.id)
            await supabase.from('tareas').upsert(
              tarea, { onConflict: 'canvas_assignment_id,user_id' }
            ).catch(() => {})
            totalImported++
          }
        } catch { log('  ⚠ Sin permisos para assignments') }

        setSyncPct(15 + Math.round(((i+1) / active.length) * 80))
      }

      // Update last sync
      await supabase.from('configuracion_usuario').upsert(
        { user_id: u.id, ultima_sync: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      setLastSync(new Date().toISOString())
      setSyncPct(100)
      log(`✓ Sincronización completa. ${totalImported} tareas importadas.`)
    } catch (err) {
      log('✗ Error: ' + err.message)
    }
    setSyncing(false)
  }

  if (!ready) return null

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

        {/* Sobre la app */}
        <div className="config-section">
          <div className="config-section-title">Acerca de Aula</div>
          <div className="config-section-sub" style={{ marginBottom: 0 }}>
            Versión 2.0 — Centro de estudios con IA.<br />
            Hecho con Next.js, Supabase y Claude AI.
          </div>
        </div>
      </div>
    </AppShell>
  )
}
