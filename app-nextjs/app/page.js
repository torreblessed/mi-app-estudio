'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconBook()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }
function IconSearch()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg> }
function IconBell()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> }
function IconChevron()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function IconLogout()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg> }
function IconPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IconSave()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconCalendar() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> }
function IconFileText() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg> }
function IconCheck()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }
function IconX()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateLong() {
  const d = new Date()
  const wd = ['dom','lun','mar','mié','jue','vie','sáb'][d.getDay()]
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${wd} ${d.getDate()} de ${months[d.getMonth()]}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function daysLabel(n) {
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}

// For the weekly events sidebar (still static data)
function subjectById(id) {
  return SUBJECTS.find(s => s.id === id) || SUBJECTS[0]
}

// For tasks from Supabase (materia is stored as text)
function subjectByMateria(materia) {
  return SUBJECTS.find(s => s.materia === materia) || null
}

// ── Static data ───────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id: 'calc',  code: 'MAT-101', name: 'Cálculo diferencial', materia: 'Cálculo diferencial', color: 'a',
    professor: 'Dra. Ramírez',  progress: 65, nextEval: { type: 'Prueba',  title: 'Prueba 2 — Límites',    daysAway: 12 } },
  { id: 'termo', code: 'FIS-201', name: 'Termodinámica',        materia: 'Termodinámica',        color: 'b',
    professor: 'Prof. Lagos',   progress: 48, nextEval: { type: 'Control', title: 'Control 1 — Gas ideal', daysAway: 7  } },
  { id: 'prog',  code: 'PRG-101', name: 'Programación',         materia: 'Programación',         color: 'c',
    professor: 'Prof. Mendoza', progress: 78, nextEval: { type: 'Entrega', title: 'Laboratorio 3',         daysAway: 5  } },
  { id: 'macro', code: 'ECO-101', name: 'Macroeconomía',        materia: 'Macroeconomía',        color: 'd',
    professor: 'Dr. Salinas',   progress: 35, nextEval: { type: 'Lectura', title: 'Cap. 6 — Inflación',    daysAway: 3  } },
  { id: 'calc2', code: 'MAT-201', name: 'Cálculo 1',            materia: 'Cálculo 1',            color: 'e',
    professor: 'Por asignar',   progress: 55, nextEval: { type: 'Quiz',    title: 'Quiz semanal',          daysAway: 0  } },
]

const SUBJECT_COLOR = {
  'Cálculo diferencial': 'a',
  'Termodinámica':       'b',
  'Programación':        'c',
  'Macroeconomía':       'd',
  'Cálculo 1':           'e',
}

const WEEK_EVENTS = [
  { id: 'e1', date: '2026-05-26', weekday: 'mar', day: 26, type: 'Quiz',    subject: 'calc2', title: 'Quiz semanal',          time: '19:00' },
  { id: 'e2', date: '2026-05-29', weekday: 'vie', day: 29, type: 'Lectura', subject: 'macro', title: 'Cap. 6 — Inflación' },
  { id: 'e3', date: '2026-05-31', weekday: 'dom', day: 31, type: 'Entrega', subject: 'prog',  title: 'Laboratorio 3',         time: '23:59' },
  { id: 'e4', date: '2026-06-02', weekday: 'mar', day:  2, type: 'Control', subject: 'termo', title: 'Control 1 — Gas ideal', time: '10:00' },
  { id: 'e5', date: '2026-06-07', weekday: 'dom', day:  7, type: 'Prueba',  subject: 'calc',  title: 'Prueba 2 — Límites',    time: '09:00' },
]

const FILTROS = [
  { label: 'Todas',               value: '' },
  { label: 'Cálculo diferencial', value: 'Cálculo diferencial' },
  { label: 'Termodinámica',       value: 'Termodinámica' },
  { label: 'Programación',        value: 'Programación' },
  { label: 'Macroeconomía',       value: 'Macroeconomía' },
  { label: 'Cálculo 1',           value: 'Cálculo 1' },
]

const MATERIAS_FORM = ['Cálculo diferencial', 'Termodinámica', 'Programación', 'Macroeconomía', 'Cálculo 1']

const THIS_WEEK_TESTS = WEEK_EVENTS.filter(e => ['Prueba', 'Control', 'Quiz'].includes(e.type)).length

// ── Sub-components ────────────────────────────────────────────────────────────
function EmptyState({ title, sub }) {
  return (
    <div className="empty">
      <div className="empty-art">
        <div className="empty-doc" />
        <div className="empty-doc" />
        <div className="empty-doc front" />
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  )
}

function SubjectCard({ subject, notasCount }) {
  const s      = subject
  const urgent = s.nextEval.daysAway <= 3
  return (
    <div className="subj-card">
      <div className="subj-card-head">
        <div className="subj-codeline">
          <span className={`dot dot-${s.color}`} />
          <span>{s.code}</span>
        </div>
        <span className="foot-stat" style={{ fontSize: 11 }}>
          {notasCount} nota{notasCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div>
        <div className="subj-name">{s.name}</div>
        <div className="subj-prof">{s.professor}</div>
      </div>
      <div className="subj-next">
        <div className="next-eyebrow">Próxima · {s.nextEval.type}</div>
        <div className="next-row">
          <span className="next-title">{s.nextEval.title}</span>
          <span className={`next-when${urgent ? ' urgent' : ''}`}>
            {daysLabel(s.nextEval.daysAway)}
          </span>
        </div>
      </div>
      <div className="subj-progress">
        <div className="progress-row">
          <span className="progress-label">Avance</span>
          <span className="progress-val">{s.progress}%</span>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${s.progress}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ user, menuOpen, setMenuOpen, menuRef, onLogout }) {
  const initial     = user?.email ? user.email[0].toUpperCase() : 'U'
  const displayName = user?.email?.split('@')[0] || 'Estudiante'
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-row">
          <div className="brand-mark sm"><IconBook /></div>
          <div className="brand-name sm">Aula</div>
        </div>
        <div className="topbar-actions">
          <div className="search-mini">
            <IconSearch />
            <input placeholder="Buscar en materias, notas…" readOnly />
            <span className="kbd">⌘K</span>
          </div>
          <button className="icon-btn" title="Notificaciones">
            <IconBell />
            <span className="dot-badge" />
          </button>
          <div className="user-menu" ref={menuRef}>
            <button className="avatar-btn" onClick={() => setMenuOpen(o => !o)}>
              <span className="avatar">{initial}</span>
              <span className="user-name">{displayName}</span>
              <IconChevron />
            </button>
            {menuOpen && (
              <div className="menu-pop">
                <div className="menu-head">
                  <div className="menu-name">{displayName}</div>
                  <div className="menu-mail">{user?.email}</div>
                </div>
                <button className="menu-item">Mi perfil</button>
                <button className="menu-item">Preferencias</button>
                <div className="menu-sep" />
                <button className="menu-item danger" onClick={onLogout}>
                  <IconLogout /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Note Modal ────────────────────────────────────────────────────────────────
function NoteModal({ onClose, onSave, materia, setMateria, titulo, setTitulo, contenido, setContenido, guardando }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2 className="card-title">Nueva nota</h2>
            <div className="card-sub">Guarda apuntes por materia</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label" htmlFor="nm-materia">Materia</label>
            <div className="input-wrap">
              <select id="nm-materia" value={materia} onChange={e => setMateria(e.target.value)}>
                {MATERIAS_FORM.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="select-arrow"><IconChevron /></span>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="nm-titulo">Título</label>
            <div className="input-wrap">
              <input type="text" id="nm-titulo" placeholder="Título de la nota"
                value={titulo} onChange={e => setTitulo(e.target.value)}
                style={{ paddingLeft: '14px' }} autoFocus />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="nm-contenido">Contenido</label>
            <div className="input-wrap textarea-wrap">
              <textarea id="nm-contenido" placeholder="Escribe tu nota aquí…"
                value={contenido} onChange={e => setContenido(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '13px 18px' }}
            onClick={onSave} disabled={guardando}>
            <IconSave />{guardando ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task Modal ────────────────────────────────────────────────────────────────
function TareaModal({ onClose, onSave, titulo, setTitulo, materia, setMateria, duracion, setDuracion, hora, setHora, creando }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2 className="card-title">Nueva tarea</h2>
            <div className="card-sub">Agrega una tarea para hoy</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label" htmlFor="tm-titulo">Título</label>
            <div className="input-wrap">
              <input type="text" id="tm-titulo" placeholder="¿Qué vas a estudiar?"
                value={titulo} onChange={e => setTitulo(e.target.value)}
                style={{ paddingLeft: '14px' }} autoFocus />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="tm-materia">Materia</label>
            <div className="input-wrap">
              <select id="tm-materia" value={materia} onChange={e => setMateria(e.target.value)}>
                {MATERIAS_FORM.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="select-arrow"><IconChevron /></span>
            </div>
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label" htmlFor="tm-duracion">Duración (min)</label>
              <div className="input-wrap">
                <input type="number" id="tm-duracion" min="5" step="5" placeholder="30"
                  value={duracion} onChange={e => setDuracion(e.target.value)}
                  style={{ paddingLeft: '14px' }} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="tm-hora">Hora</label>
              <div className="input-wrap">
                <input type="time" id="tm-hora"
                  value={hora} onChange={e => setHora(e.target.value)}
                  style={{ paddingLeft: '14px' }} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '13px 18px' }}
            onClick={onSave} disabled={creando}>
            <IconSave />{creando ? 'Guardando…' : 'Agregar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router  = useRouter()
  const menuRef = useRef(null)

  // Auth
  const [ready,    setReady]    = useState(false)
  const [user,     setUser]     = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Tareas (Supabase)
  const [tareas,         setTareas]         = useState([])
  const [loadingTareas,  setLoadingTareas]  = useState(true)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [tituloTarea,    setTituloTarea]    = useState('')
  const [materiaTarea,   setMateriaTarea]   = useState('Cálculo diferencial')
  const [duracionTarea,  setDuracionTarea]  = useState(30)
  const [horaTarea,      setHoraTarea]      = useState('')
  const [creandoTarea,   setCreandoTarea]   = useState(false)

  // Notas (Supabase)
  const [notas,     setNotas]     = useState([])
  const [filtro,    setFiltro]    = useState('')
  const [titulo,    setTitulo]    = useState('')
  const [contenido, setContenido] = useState('')
  const [materia,   setMateria]   = useState('Cálculo diferencial')
  const [guardando, setGuardando] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Tareas ──────────────────────────────────────────────────────────────
  const cargarTareas = useCallback(async () => {
    setLoadingTareas(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadingTareas(false); return }
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .eq('user_id', u.id)
      .eq('fecha', hoy)
      .order('hora', { ascending: true, nullsFirst: false })
    if (!error) setTareas(data ?? [])
    setLoadingTareas(false)
  }, [])

  useEffect(() => {
    if (ready) cargarTareas()
  }, [ready, cargarTareas])

  async function toggleTarea(id, completada) {
    // Optimistic update
    setTareas(prev => prev.map(t => t.id === id ? { ...t, completada: !completada } : t))
    const { error } = await supabase
      .from('tareas')
      .update({ completada: !completada })
      .eq('id', id)
    if (error) {
      // Revert on failure
      setTareas(prev => prev.map(t => t.id === id ? { ...t, completada } : t))
      console.error(error)
    }
  }

  async function crearTarea() {
    if (!tituloTarea.trim()) { alert('Agrega un título a la tarea'); return }
    setCreandoTarea(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const hoy = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('tareas').insert({
      user_id:     u.id,
      titulo:      tituloTarea.trim(),
      materia:     materiaTarea,
      duracion_min: Number(duracionTarea) || 30,
      hora:        horaTarea || null,
      completada:  false,
      fecha:       hoy,
    })
    if (!error) {
      setTituloTarea('')
      setMateriaTarea('Cálculo diferencial')
      setDuracionTarea(30)
      setHoraTarea('')
      setTareaModalOpen(false)
      cargarTareas()
    } else {
      console.error(error)
    }
    setCreandoTarea(false)
  }

  // ── Notas ───────────────────────────────────────────────────────────────
  const cargarNotas = useCallback(async (materiaFiltro) => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    let q = supabase.from('notas').select('*').eq('user_id', u.id).order('created_at', { ascending: false })
    if (materiaFiltro) q = q.eq('materia', materiaFiltro)
    const { data, error } = await q
    if (!error) setNotas(data ?? [])
  }, [])

  useEffect(() => {
    if (ready) cargarNotas('')
  }, [ready, cargarNotas])

  function cambiarFiltro(valor) {
    setFiltro(valor)
    cargarNotas(valor)
  }

  async function guardarNota() {
    if (!titulo.trim() || !contenido.trim()) { alert('Completa los campos'); return }
    setGuardando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notas').insert({ titulo, contenido, materia, user_id: u.id })
    if (!error) { setTitulo(''); setContenido(''); setModalOpen(false); cargarNotas(filtro) }
    else console.error(error)
    setGuardando(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) return null

  const remaining    = tareas.filter(t => !t.completada).length
  const totalMinutes = tareas.filter(t => !t.completada).reduce((s, t) => s + (t.duracion_min || 0), 0)
  const todayStr     = new Date().toISOString().slice(0, 10)

  return (
    <>
      <Topbar
        user={user}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuRef={menuRef}
        onLogout={cerrarSesion}
      />

      <main className="dash-body">
        {/* Hero */}
        <header className="hero">
          <div>
            <div className="hero-date">{formatDateLong()}</div>
            <h1 className="hero-title">
              Hola, André.{' '}
              <span className="hero-accent">
                Esta semana tienes <strong>{THIS_WEEK_TESTS} evaluaciones</strong> y{' '}
                {remaining} {remaining === 1 ? 'tarea' : 'tareas'} pendientes para hoy.
              </span>
            </h1>
          </div>
        </header>

        <div className="dash-grid">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="dash-left">

            {/* Hoy */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Hoy</h2>
                {!loadingTareas && tareas.length > 0 && (
                  <span className="link-mini">
                    {remaining} pendiente{remaining !== 1 ? 's' : ''} · {Math.round(totalMinutes / 60 * 10) / 10}h estimadas
                  </span>
                )}
                <button className="btn btn-ghost xs" onClick={() => setTareaModalOpen(true)}>
                  <IconPlus /> Tarea
                </button>
              </div>

              {loadingTareas ? (
                <p className="task-loading">Cargando tareas…</p>
              ) : tareas.length === 0 ? (
                <div className="task-empty">
                  <span>No tienes tareas para hoy.</span>
                  <button className="link-mini" onClick={() => setTareaModalOpen(true)}>
                    + Agregar una
                  </button>
                </div>
              ) : (
                <ul className="task-list">
                  {tareas.map(t => {
                    const s = subjectByMateria(t.materia)
                    return (
                      <li key={t.id} className={`task ${t.completada ? 'task-done' : ''}`}>
                        <button
                          className={`tcheck ${t.completada ? 'checked' : ''}`}
                          onClick={() => toggleTarea(t.id, t.completada)}
                          aria-label="Marcar tarea"
                        >
                          {t.completada && <IconCheck />}
                        </button>
                        <div className="task-main">
                          <div className="task-title">{t.titulo}</div>
                          <div className="task-meta">
                            {s && <span className={`dot dot-${s.color}`} />}
                            <span>{t.materia}</span>
                            {t.duracion_min && (
                              <>
                                <span className="meta-sep">·</span>
                                <span>{t.duracion_min} min</span>
                              </>
                            )}
                          </div>
                        </div>
                        {t.hora && <span className="task-time">{t.hora}</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Materias */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Materias</h2>
                <span className="link-mini">{SUBJECTS.length} asignaturas</span>
              </div>
              <div className="subjects-grid">
                {SUBJECTS.map(s => (
                  <SubjectCard
                    key={s.code}
                    subject={s}
                    notasCount={notas.filter(n => n.materia === s.materia).length}
                  />
                ))}
              </div>
            </section>

            {/* Mis notas */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Mis notas</h2>
                <button className="btn btn-ghost xs" onClick={() => setModalOpen(true)}>
                  <IconPlus /> Nueva
                </button>
              </div>
              <div className="filter-row">
                {FILTROS.map(f => (
                  <button
                    key={f.value}
                    className={`filter-btn${filtro === f.value ? ' activo' : ''}`}
                    onClick={() => cambiarFiltro(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {notas.length === 0 ? (
                <EmptyState
                  title="Sin notas aún"
                  sub="Usa el botón Nueva o el FAB para crear tu primera nota."
                />
              ) : (
                <div className="notes-tab">
                  <div className="notes-head">
                    <div className="files-label">{notas.length} nota{notas.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="notes-grid">
                    {notas.map(nota => (
                      <article key={nota.id} className="note-card">
                        <div className="note-top">
                          <span className={`pill pill-${SUBJECT_COLOR[nota.materia] || ''}`}>
                            {nota.materia || 'Sin materia'}
                          </span>
                        </div>
                        <h3 className="note-title">{nota.titulo}</h3>
                        <p className="note-body">{nota.contenido}</p>
                        <div className="note-foot">
                          <span className="note-date">
                            <IconCalendar />{' '}{formatDate(nota.created_at)}
                          </span>
                          <span className="note-action">
                            <IconFileText /> Abrir →
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <aside className="dash-right">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Esta semana</h2>
                  <div className="card-sub">{WEEK_EVENTS.length} eventos próximos</div>
                </div>
                <button className="icon-btn sm" title="Ver calendario">
                  <IconCalendar />
                </button>
              </div>
              <ul className="week-list">
                {WEEK_EVENTS.map(ev => {
                  const s       = subjectById(ev.subject)
                  const isToday = ev.date === todayStr
                  return (
                    <li key={ev.id} className={`wk ${isToday ? 'wk-today' : ''}`}>
                      <div className="wk-date">
                        <div className="wk-wd">{ev.weekday}</div>
                        <div className="wk-d">{String(ev.day).padStart(2, '0')}</div>
                      </div>
                      <div className="wk-body">
                        <div className="wk-row">
                          <span className={`pill pill-${s.color}`}>{ev.type}</span>
                          {ev.time && <span className="wk-time">{ev.time}</span>}
                        </div>
                        <div className="wk-title">{ev.title}</div>
                        <div className="wk-sub">
                          <span className={`dot dot-${s.color}`} />{s.name}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </aside>

        </div>
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setModalOpen(true)}>
        <IconPlus />
        <span>Nueva nota</span>
      </button>

      {/* Note Modal */}
      {modalOpen && (
        <NoteModal
          onClose={() => setModalOpen(false)}
          onSave={guardarNota}
          materia={materia}
          setMateria={setMateria}
          titulo={titulo}
          setTitulo={setTitulo}
          contenido={contenido}
          setContenido={setContenido}
          guardando={guardando}
        />
      )}

      {/* Task Modal */}
      {tareaModalOpen && (
        <TareaModal
          onClose={() => setTareaModalOpen(false)}
          onSave={crearTarea}
          titulo={tituloTarea}
          setTitulo={setTituloTarea}
          materia={materiaTarea}
          setMateria={setMateriaTarea}
          duracion={duracionTarea}
          setDuracion={setDuracionTarea}
          hora={horaTarea}
          setHora={setHoraTarea}
          creando={creandoTarea}
        />
      )}
    </>
  )
}
