'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { getCourses, getCoursesRaw, syncCanvasData } from '@/lib/canvas'

function IconCanvas()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> }
function IconCheck()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }
function IconSave()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconRefresh() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> }
function IconBook()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }
function IconSearch()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg> }

// ── Toggle de materia activa ───────────────────────────────────────────────────
function MateriaToggle({ materia, onToggle }) {
  const activa = materia.activa !== false
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 0', borderBottom: '1px solid var(--border-subtle, #f0ede8)',
    }}>
      <button onClick={() => onToggle(materia.id, activa)} title={activa ? 'Desactivar' : 'Activar'}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: activa ? 'var(--c-b, #22c55e)' : 'var(--ink-5, #ccc)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', padding: 0,
        }}>
        <span style={{
          position: 'absolute', top: 3, left: activa ? 20 : 4,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: activa ? 'var(--ink-1)' : 'var(--ink-4)' }}>
          {materia.nombre}
        </div>
        {materia.codigo && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{materia.codigo}</div>}
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function enrollmentLabel(course) {
  const enr = course.enrollments?.[0]?.enrollment_state || course.enrollment_state || '?'
  const labels = { active: 'activa', invited: 'invitado', completed: 'completada', deleted: 'eliminada' }
  return labels[enr] || enr
}

function termLabel(course) {
  return course.term?.name || ''
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const router = useRouter()
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  // Perfil
  const [rut,         setRut]         = useState('')

  // Canvas config
  const [canvasUrl,   setCanvasUrl]   = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [testStatus,  setTestStatus]  = useState(null)
  const [lastSync,    setLastSync]    = useState(null)

  // Sync wizard: step 0=idle 1=loading 2=selecting 3=syncing 4=done
  const [syncStep,    setSyncStep]    = useState(0)
  const [rawCourses,  setRawCourses]  = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [syncLog,     setSyncLog]     = useState('')
  const [syncPct,     setSyncPct]     = useState(0)
  const [syncResult,  setSyncResult]  = useState(null)
  const [syncError,   setSyncError]   = useState('')

  // Debug canvas
  const [debugOpen,    setDebugOpen]    = useState(false)
  const [debugCourses, setDebugCourses] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugError,   setDebugError]   = useState('')

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
        .from('configuracion_usuario').select('*')
        .eq('user_id', data.session.user.id).single()
      if (cfg) {
        if (cfg.canvas_url)   setCanvasUrl(cfg.canvas_url)
        if (cfg.canvas_token) setCanvasToken(cfg.canvas_token)
        if (cfg.ultima_sync)  setLastSync(cfg.ultima_sync)
        if (cfg.rut)          setRut(cfg.rut)
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

  useEffect(() => { if (ready) cargarMaterias() }, [ready, cargarMaterias])

  // ── Config ────────────────────────────────────────────────────────────────
  async function guardarConfig() {
    setSaving(true); setSaved(false)
    const { data: { user: u } } = await supabase.auth.getUser()
    const payload = {
      user_id: u.id,
      rut:          rut.trim() || null,
      canvas_url:   canvasUrl.trim().replace(/\/$/, ''),
      canvas_token: canvasToken.trim(),
      updated_at:   new Date().toISOString(),
    }
    const { error } = await supabase.from('configuracion_usuario')
      .upsert(payload, { onConflict: 'user_id' })
    if (!error) {
      localStorage.setItem('canvas_config', JSON.stringify({ url: payload.canvas_url, token: payload.canvas_token }))
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } else {
      alert('Error guardando configuración: ' + error.message)
    }
    setSaving(false)
  }

  async function probarConexion() {
    setTestStatus(null)
    try {
      const courses = await getCourses(canvasUrl.trim().replace(/\/$/, ''), canvasToken.trim())
      setTestStatus(Array.isArray(courses) ? 'ok' : 'err')
    } catch {
      setTestStatus('err')
    }
  }

  // ── Toggle materia ────────────────────────────────────────────────────────
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

  // ── Debug Canvas ──────────────────────────────────────────────────────────
  async function verDebugCursos() {
    if (!canvasUrl || !canvasToken) { alert('Guarda primero la URL y el token.'); return }
    setDebugOpen(true); setDebugLoading(true); setDebugError(''); setDebugCourses(null)
    try {
      const url = canvasUrl.trim().replace(/\/$/, '')
      const tok = canvasToken.trim()
      const courses = await getCoursesRaw(url, tok)
      if (!Array.isArray(courses)) throw new Error('Respuesta inesperada de Canvas')
      setDebugCourses(courses)
    } catch (err) {
      setDebugError(err.message)
    }
    setDebugLoading(false)
  }

  // ── Sync wizard ───────────────────────────────────────────────────────────
  async function iniciarSync() {
    if (!canvasUrl || !canvasToken) { alert('Guarda primero la URL y el token de Canvas.'); return }
    setSyncStep(1); setSyncLog(''); setSyncPct(0); setSyncResult(null); setSyncError('')
    const url = canvasUrl.trim().replace(/\/$/, '')
    const tok = canvasToken.trim()
    try {
      // Intenta primero enrollment_state=active
      const active = await getCourses(url, tok)
      if (!Array.isArray(active)) throw new Error('Token inválido o URL incorrecta.')

      let allCourses = active

      // Si hay muy pocos resultados, complementa con cursos sin filtro
      if (active.length < 3) {
        const raw = await getCoursesRaw(url, tok)
        if (Array.isArray(raw)) {
          // Merge deduplicado por id
          const idsSeen = new Set(active.map(c => c.id))
          const extra = raw.filter(c => !idsSeen.has(c.id))
          allCourses = [...active, ...extra]
        }
      }

      // Quitar cursos sin acceso
      allCourses = allCourses.filter(c => !c.access_restricted_by_date)

      setRawCourses(allCourses)
      // Pre-seleccionar los activos
      setSelectedIds(new Set(active.filter(c => !c.access_restricted_by_date).map(c => c.id)))
      setSyncStep(2)
    } catch (err) {
      setSyncError(err.message)
      setSyncStep(0)
    }
  }

  async function ejecutarSync() {
    const selected = rawCourses.filter(c => selectedIds.has(c.id))
    if (!selected.length) { alert('Selecciona al menos una materia.'); return }
    setSyncStep(3); setSyncLog(''); setSyncPct(0)
    const { data: { user: u } } = await supabase.auth.getUser()
    try {
      const result = await syncCanvasData(
        canvasUrl.trim().replace(/\/$/, ''), canvasToken.trim(),
        u.id, supabase,
        {
          onLog:      msg => setSyncLog(prev => prev ? prev + '\n' + msg : msg),
          onProgress: n   => setSyncPct(n),
        },
        selected,
      )
      setSyncResult(result)
      setLastSync(result.now)
      cargarMaterias()
      setSyncStep(4)
    } catch (err) {
      setSyncLog(prev => (prev ? prev + '\n' : '') + '✗ ' + err.message)
      setSyncError(err.message)
    }
  }

  function toggleCourse(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
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

        {/* ── Perfil ─────────────────────────────────────────────────────────── */}
        <div className="config-section">
          <div className="config-section-title">Perfil</div>
          <div className="config-section-sub">
            Tu RUT se usa para identificar tus notas automáticamente cuando analizas archivos de calificaciones del curso.
          </div>
          <div className="field">
            <label className="label">RUT</label>
            <div className="input-wrap">
              <input type="text" placeholder="12.345.678-9"
                value={rut} onChange={e => setRut(e.target.value)} style={{ paddingLeft: 14 }} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary sm" onClick={guardarConfig} disabled={saving}>
              <IconSave />{saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar perfil'}
            </button>
          </div>
        </div>

        {/* ── Canvas LMS ─────────────────────────────────────────────────────── */}
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
                  value={canvasUrl} onChange={e => setCanvasUrl(e.target.value)} style={{ paddingLeft: 14 }} />
              </div>
            </div>
            <div className="field">
              <label className="label">API Token</label>
              <div className="input-wrap">
                <input type="password" placeholder="Tu token de acceso personal de Canvas"
                  value={canvasToken} onChange={e => setCanvasToken(e.target.value)} style={{ paddingLeft: 14 }} />
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
                <div className="config-status-dot ok" />{' '}Conexión exitosa con Canvas
              </div>
            )}
            {testStatus === 'err' && (
              <div className="config-status">
                <div className="config-status-dot err" />{' '}No se pudo conectar. Verifica la URL y el token.
              </div>
            )}
          </div>
        </div>

        {/* ── Sincronización wizard ───────────────────────────────────────────── */}
        <div className="config-section">
          <div className="config-section-title">Sincronización con Canvas</div>

          {lastSync && syncStep === 0 && (
            <div className="config-section-sub" style={{ marginBottom: 14 }}>
              Última sync: {new Date(lastSync).toLocaleString('es-CL')}
            </div>
          )}

          {syncError && syncStep === 0 && (
            <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12, padding: '8px 12px', background: '#fff1f1', borderRadius: 8 }}>
              ✗ {syncError}
            </div>
          )}

          {/* Step 0: idle */}
          {syncStep === 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary sm" onClick={iniciarSync} disabled={!canvasUrl || !canvasToken}>
                <IconRefresh /> Sincronizar con Canvas
              </button>
              <button className="btn btn-ghost sm" onClick={verDebugCursos} disabled={!canvasUrl || !canvasToken}
                style={{ fontSize: 12 }}>
                <IconSearch /> Debug: ver todos mis cursos
              </button>
            </div>
          )}

          {/* Step 1: loading */}
          {syncStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Conectando con Canvas…</div>
              <div className="sync-bar-track">
                <div className="sync-bar-fill" style={{ width: '35%', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {/* Step 2: course selection */}
          {syncStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-1)' }}>
                Se encontraron <strong>{rawCourses.length}</strong> curso(s) en tu cuenta de Canvas.
                Selecciona los que cursas actualmente:
              </div>

              {/* Select all / clear */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                <button className="btn btn-ghost xs"
                  onClick={() => setSelectedIds(new Set(rawCourses.map(c => c.id)))}>
                  Seleccionar todos
                </button>
                <button className="btn btn-ghost xs"
                  onClick={() => setSelectedIds(new Set())}>
                  Limpiar
                </button>
                <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>
                  {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Course list */}
              <div style={{
                border: '1px solid var(--border)', borderRadius: 10,
                maxHeight: 360, overflowY: 'auto',
              }}>
                {rawCourses.map((c, i) => {
                  const checked = selectedIds.has(c.id)
                  const enr = enrollmentLabel(c)
                  const term = termLabel(c)
                  return (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: i < rawCourses.length - 1 ? '1px solid var(--border-subtle, #f0ede8)' : 'none',
                      background: checked ? 'var(--c-b-light, #f0fdf4)' : 'transparent',
                      transition: 'background 0.12s',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCourse(c.id)}
                        style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)', marginBottom: 2 }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {c.course_code && <span>Código: {c.course_code}</span>}
                          <span style={{
                            padding: '1px 6px', borderRadius: 4, fontWeight: 600, fontSize: 10,
                            background: enr === 'activa' ? '#dcfce7' : '#f3f4f6',
                            color: enr === 'activa' ? '#166534' : 'var(--ink-4)',
                          }}>{enr}</span>
                          {term && <span>{term}</span>}
                          {c.start_at && <span>Inicio: {c.start_at.slice(0, 10)}</span>}
                        </div>
                      </div>
                      {checked && <IconCheck />}
                    </label>
                  )
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost sm" onClick={() => setSyncStep(0)}>Cancelar</button>
                <button className="btn btn-primary sm" onClick={ejecutarSync} disabled={selectedIds.size === 0}>
                  <IconRefresh /> Importar {selectedIds.size} materia{selectedIds.size !== 1 ? 's' : ''} →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: syncing */}
          {syncStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
                Sincronizando {selectedIds.size} materia{selectedIds.size !== 1 ? 's' : ''}…
              </div>
              <div className="sync-bar-track">
                <div className="sync-bar-fill" style={{ width: `${syncPct}%`, transition: 'width 0.4s ease' }} />
              </div>
              {syncLog && (
                <div className="sync-log" style={{ maxHeight: 220, overflow: 'auto', fontSize: 12 }}>
                  {syncLog.split('\n').filter(Boolean).map((l, i) => (
                    <div key={i} style={{ color: l.startsWith('  ✓') ? 'var(--c-b)' : l.startsWith('  ⚠') ? 'var(--c-d)' : 'inherit' }}>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: done */}
          {syncStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'var(--surface-2)', borderRadius: 10,
                padding: '16px 20px', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 8 }}>
                  ✓ Sync completado
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                  {syncResult && (
                    <>
                      <span>📚 {syncResult.totalMaterias} materia{syncResult.totalMaterias !== 1 ? 's' : ''}</span>
                      <span>📋 {syncResult.totalTareas} tarea{syncResult.totalTareas !== 1 ? 's' : ''}</span>
                      <span>📊 {syncResult.totalCalif} calificacion{syncResult.totalCalif !== 1 ? 'es' : ''}</span>
                    </>
                  )}
                </div>
              </div>
              {syncLog && (
                <details>
                  <summary style={{ fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer', userSelect: 'none' }}>
                    Ver log completo
                  </summary>
                  <div className="sync-log" style={{ marginTop: 6, fontSize: 11.5, maxHeight: 200, overflow: 'auto' }}>
                    {syncLog.split('\n').filter(Boolean).map((l, i) => (
                      <div key={i} style={{ color: l.startsWith('  ✓') ? 'var(--c-b)' : l.startsWith('  ⚠') ? 'var(--c-d)' : 'inherit' }}>
                        {l}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <button className="btn btn-ghost sm" onClick={() => setSyncStep(0)} style={{ alignSelf: 'flex-start' }}>
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* ── Debug Canvas ────────────────────────────────────────────────────── */}
        {debugOpen && (
          <div className="config-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="config-section-title" style={{ fontSize: 14 }}>
                🔍 Debug — Todos los cursos en Canvas (sin filtros)
              </div>
              <button className="btn btn-ghost xs" onClick={() => { setDebugOpen(false); setDebugCourses(null) }}>
                Cerrar
              </button>
            </div>

            {debugLoading && (
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Cargando cursos…</div>
            )}
            {debugError && (
              <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px 12px', background: '#fff1f1', borderRadius: 8 }}>
                ✗ {debugError}
              </div>
            )}
            {debugCourses && (
              <>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 10 }}>
                  {debugCourses.length} curso(s) encontrado(s) en tu cuenta Canvas
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['ID','Nombre','Código','Estado inscripción','workflow_state','Término','Inicio','Fin'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {debugCourses.map((c, i) => {
                        const enr = enrollmentLabel(c)
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-4)', fontFamily: 'monospace' }}>{c.id}</td>
                            <td style={{ padding: '6px 10px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-3)' }}>{c.course_code || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{
                                padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                background: enr === 'activa' ? '#dcfce7' : '#f3f4f6',
                                color: enr === 'activa' ? '#166534' : 'var(--ink-4)',
                              }}>{enr}</span>
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-4)', fontFamily: 'monospace', fontSize: 11 }}>{c.workflow_state || '—'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-3)' }}>{termLabel(c) || '—'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{c.start_at?.slice(0, 10) || '—'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{c.end_at?.slice(0, 10) || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Materias activas ────────────────────────────────────────────────── */}
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

        {/* ── Acerca de ────────────────────────────────────────────────────────── */}
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
