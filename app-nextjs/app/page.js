'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a', 'b', 'c', 'd', 'e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TIPO_PILL  = { tarea:'c', prueba:'d', entrega:'a', lectura:'b', quiz:'e' }
const TIPO_LABEL = { tarea:'Tarea', prueba:'Prueba', entrega:'Entrega', lectura:'Lectura', quiz:'Quiz' }
const TIPOS_FORM  = ['tarea','prueba','entrega','lectura','quiz']
const WEEKDAYS_ES = ['dom','lun','mar','mié','jue','vie','sáb']

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonTasks() {
  return <div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton-task"/>)}</div>
}
function SkeletonCards() {
  return <div className="skeleton-grid">{[1,2,3].map(i=><div key={i} className="skeleton-card"/>)}</div>
}
function SkeletonNotes() {
  return <div className="skeleton-notes-grid">{[1,2,3].map(i=><div key={i} className="skeleton-note"/>)}</div>
}

// ── Empty state ───────────────────────────────────────────────────────────────
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

// ── Subject card ──────────────────────────────────────────────────────────────
function SubjectCard({ materia, onClick }) {
  const color  = materiaColor(materia.nombre)
  const ne     = materia.nextEval
  const urgent = ne && ne.daysAway <= 3
  return (
    <button className="subj-card" onClick={onClick}>
      <div className="subj-card-head">
        <div className="subj-codeline">
          <span className={`dot dot-${color}`} />
          <span>{materia.nombre}</span>
        </div>
        <span className="foot-stat" style={{ fontSize: 11 }}>
          {materia.notasCount} nota{materia.notasCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="subj-name">{materia.nombre}</div>
      {ne ? (
        <div className="subj-next">
          <div className="next-eyebrow">Próxima · {TIPO_LABEL[ne.tipo] || ne.tipo}</div>
          <div className="next-row">
            <span className="next-title">{ne.titulo}</span>
            <span className={`next-when${urgent ? ' urgent' : ''}`}>{daysLabel(ne.daysAway)}</span>
          </div>
        </div>
      ) : (
        <div className="subj-next">
          <div className="next-eyebrow" style={{ color: 'var(--ink-5)' }}>Sin evaluaciones próximas</div>
        </div>
      )}
    </button>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ user, menuOpen, setMenuOpen, menuRef, onLogout }) {
  const initial     = user?.email ? user.email[0].toUpperCase() : 'U'
  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Estudiante'
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
          <button className="icon-btn" title="Notificaciones"><IconBell /><span className="dot-badge" /></button>
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

// ── Note modal ────────────────────────────────────────────────────────────────
function NoteModal({ onClose, onSave, materia, setMateria, titulo, setTitulo, contenido, setContenido, guardando, materiasList }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Nueva nota</h2><div className="card-sub">Guarda apuntes por materia</div></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label" htmlFor="nm-materia">Materia</label>
            <div className="input-wrap">
              {materiasList.length > 0 ? (
                <><select id="nm-materia" value={materia} onChange={e => setMateria(e.target.value)}>
                  {materiasList.map(m => <option key={m} value={m}>{m}</option>)}
                </select><span className="select-arrow"><IconChevron /></span></>
              ) : (
                <input type="text" id="nm-materia" placeholder="Nombre de la materia"
                  value={materia} onChange={e => setMateria(e.target.value)} style={{ paddingLeft:'14px' }} />
              )}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="nm-titulo">Título</label>
            <div className="input-wrap">
              <input type="text" id="nm-titulo" placeholder="Título de la nota"
                value={titulo} onChange={e => setTitulo(e.target.value)} style={{ paddingLeft:'14px' }} autoFocus />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="nm-contenido">Contenido</label>
            <div className="input-wrap textarea-wrap">
              <textarea id="nm-contenido" placeholder="Escribe tu nota aquí…"
                value={contenido} onChange={e => setContenido(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', padding:'13px 18px' }} onClick={onSave} disabled={guardando}>
            <IconSave />{guardando ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task modal (crear) ────────────────────────────────────────────────────────
function TareaModal({ onClose, onSave, titulo, setTitulo, materia, setMateria, tipo, setTipo, fecha, setFecha, duracion, setDuracion, hora, setHora, creando, materiasList }) {
  const [error, setError] = useState('')

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  function handleSave() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setError('')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Nueva tarea</h2><div className="card-sub">Agrégala al calendario semanal</div></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label" htmlFor="tm-titulo">Título</label>
            <div className="input-wrap" style={error ? {borderColor:'var(--danger)'} : {}}>
              <input type="text" id="tm-titulo" placeholder="¿Qué vas a estudiar?"
                value={titulo} onChange={e => { setTitulo(e.target.value); if(error) setError('') }}
                style={{ paddingLeft:'14px' }} autoFocus />
            </div>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label" htmlFor="tm-materia">Materia</label>
              <div className="input-wrap">
                {materiasList.length > 0 ? (
                  <><select id="tm-materia" value={materia} onChange={e => setMateria(e.target.value)}>
                    {materiasList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select><span className="select-arrow"><IconChevron /></span></>
                ) : (
                  <input type="text" id="tm-materia" placeholder="Materia"
                    value={materia} onChange={e => setMateria(e.target.value)} style={{ paddingLeft:'14px' }} />
                )}
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="tm-tipo">Tipo</label>
              <div className="input-wrap">
                <select id="tm-tipo" value={tipo} onChange={e => setTipo(e.target.value)}>
                  {TIPOS_FORM.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
                <span className="select-arrow"><IconChevron /></span>
              </div>
            </div>
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label" htmlFor="tm-fecha">Fecha</label>
              <div className="input-wrap">
                <input type="date" id="tm-fecha" value={fecha} onChange={e => setFecha(e.target.value)} style={{ paddingLeft:'14px' }} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="tm-hora">Hora</label>
              <div className="input-wrap">
                <input type="time" id="tm-hora" value={hora} onChange={e => setHora(e.target.value)} style={{ paddingLeft:'14px' }} />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="tm-duracion">Duración (min)</label>
            <div className="input-wrap">
              <input type="number" id="tm-duracion" min="5" step="5" placeholder="30"
                value={duracion} onChange={e => setDuracion(e.target.value)} style={{ paddingLeft:'14px' }} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', padding:'13px 18px' }} onClick={handleSave} disabled={creando}>
            <IconSave />{creando ? 'Guardando…' : 'Agregar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit task modal ───────────────────────────────────────────────────────────
function EditTareaModal({ onClose, onSave, tarea, materiasList }) {
  const [titulo,   setTitulo]   = useState(tarea.titulo || '')
  const [materia,  setMateria]  = useState(tarea.materia || '')
  const [tipo,     setTipo]     = useState(tarea.tipo || 'tarea')
  const [fecha,    setFecha]    = useState(tarea.fecha || '')
  const [hora,     setHora]     = useState(tarea.hora || '')
  const [duracion, setDuracion] = useState(tarea.duracion_min || 30)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSave() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true)
    await onSave({ titulo: titulo.trim(), materia, tipo, fecha, hora: hora || null, duracion_min: Number(duracion) || 30 })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Editar tarea</h2><div className="card-sub">Modifica los datos de esta tarea</div></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label">Título</label>
            <div className="input-wrap" style={error ? {borderColor:'var(--danger)'} : {}}>
              <input type="text" placeholder="¿Qué vas a estudiar?" value={titulo}
                onChange={e => { setTitulo(e.target.value); if(error) setError('') }}
                style={{ paddingLeft:'14px' }} autoFocus />
            </div>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Materia</label>
              <div className="input-wrap">
                {materiasList.length > 0 ? (
                  <><select value={materia} onChange={e => setMateria(e.target.value)}>
                    {materiasList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select><span className="select-arrow"><IconChevron /></span></>
                ) : (
                  <input type="text" value={materia} onChange={e => setMateria(e.target.value)} style={{ paddingLeft:'14px' }} />
                )}
              </div>
            </div>
            <div className="field">
              <label className="label">Tipo</label>
              <div className="input-wrap">
                <select value={tipo} onChange={e => setTipo(e.target.value)}>
                  {TIPOS_FORM.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
                <span className="select-arrow"><IconChevron /></span>
              </div>
            </div>
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Fecha</label>
              <div className="input-wrap">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ paddingLeft:'14px' }} />
              </div>
            </div>
            <div className="field">
              <label className="label">Hora</label>
              <div className="input-wrap">
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ paddingLeft:'14px' }} />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Duración (min)</label>
            <div className="input-wrap">
              <input type="number" min="5" step="5" value={duracion}
                onChange={e => setDuracion(e.target.value)} style={{ paddingLeft:'14px' }} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', padding:'13px 18px' }} onClick={handleSave} disabled={saving}>
            <IconSave />{saving ? 'Guardando…' : 'Guardar cambios'}
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

  // Tareas de hoy
  const [tareas,         setTareas]         = useState([])
  const [loadingTareas,  setLoadingTareas]  = useState(true)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [tituloTarea,    setTituloTarea]    = useState('')
  const [materiaTarea,   setMateriaTarea]   = useState('')
  const [tipoTarea,      setTipoTarea]      = useState('tarea')
  const [fechaTarea,     setFechaTarea]     = useState('')
  const [duracionTarea,  setDuracionTarea]  = useState(30)
  const [horaTarea,      setHoraTarea]      = useState('')
  const [creandoTarea,   setCreandoTarea]   = useState(false)

  // Edit task
  const [editTareaData, setEditTareaData] = useState(null)

  // Calendario semanal
  const [weekTareas,  setWeekTareas]  = useState([])
  const [loadingWeek, setLoadingWeek] = useState(true)

  // Evaluaciones futuras
  const [upcomingEvals, setUpcomingEvals] = useState([])

  // Alert banner
  const [dismissedAlert, setDismissedAlert] = useState(false)

  // Notas
  const [allNotas,  setAllNotas]  = useState([])
  const [loadNotas, setLoadNotas] = useState(true)
  const [filtro,    setFiltro]    = useState('')
  const [titulo,    setTitulo]    = useState('')
  const [contenido, setContenido] = useState('')
  const [materia,   setMateria]   = useState('')
  const [guardando, setGuardando] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // ── Computed ──────────────────────────────────────────────────────────────
  const notasFiltradas = useMemo(
    () => filtro ? allNotas.filter(n => n.materia === filtro) : allNotas,
    [allNotas, filtro]
  )

  const materias = useMemo(() => {
    const map = {}
    allNotas.forEach(n => {
      if (!n.materia) return
      if (!map[n.materia]) map[n.materia] = { nombre: n.materia, notasCount: 0, nextEval: null }
      map[n.materia].notasCount++
    })
    upcomingEvals.forEach(e => {
      if (!e.materia) return
      if (!map[e.materia]) map[e.materia] = { nombre: e.materia, notasCount: 0, nextEval: null }
      if (!map[e.materia].nextEval) {
        const d = new Date(e.fecha + 'T12:00:00')
        const hoy = new Date(); hoy.setHours(0,0,0,0)
        const daysAway = Math.round((d - hoy) / 86400000)
        map[e.materia].nextEval = { tipo: e.tipo, titulo: e.titulo, daysAway }
      }
    })
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [allNotas, upcomingEvals])

  const materiasList = useMemo(() => materias.map(m => m.nombre), [materias])

  const urgentEval = useMemo(() => {
    return upcomingEvals.find(e => {
      const d = new Date(e.fecha + 'T12:00:00')
      const hoy = new Date(); hoy.setHours(0,0,0,0)
      const days = Math.round((d - hoy) / 86400000)
      return days >= 0 && days <= 3
    })
  }, [upcomingEvals])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Estudiante'

  // ── Sync modal defaults ───────────────────────────────────────────────────
  useEffect(() => {
    if (materiasList.length > 0 && !materiaTarea) setMateriaTarea(materiasList[0])
  }, [materiasList, materiaTarea])

  useEffect(() => {
    if (materiasList.length > 0 && !materia) setMateria(materiasList[0])
  }, [materiasList, materia])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Tareas de hoy ─────────────────────────────────────────────────────────
  const cargarTareas = useCallback(async () => {
    setLoadingTareas(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadingTareas(false); return }
    const hoy = new Date().toISOString().slice(0,10)
    const { data, error } = await supabase
      .from('tareas').select('*').eq('user_id', u.id).eq('fecha', hoy)
      .order('hora', { ascending: true, nullsFirst: false })
    if (!error) setTareas(data ?? [])
    setLoadingTareas(false)
  }, [])

  useEffect(() => { if (ready) cargarTareas() }, [ready, cargarTareas])

  // ── Calendario ────────────────────────────────────────────────────────────
  const cargarCalendario = useCallback(async () => {
    setLoadingWeek(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadingWeek(false); return }
    const hoy = new Date()
    const desde = hoy.toISOString().slice(0,10)
    const fin = new Date(hoy); fin.setDate(fin.getDate() + 7)
    const hasta = fin.toISOString().slice(0,10)
    const { data, error } = await supabase
      .from('tareas').select('*').eq('user_id', u.id)
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false })
    if (!error) setWeekTareas(data ?? [])
    setLoadingWeek(false)
  }, [])

  useEffect(() => { if (ready) cargarCalendario() }, [ready, cargarCalendario])

  // ── Evals futuras ─────────────────────────────────────────────────────────
  const cargarEvals = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const hoy = new Date().toISOString().slice(0,10)
    const { data, error } = await supabase
      .from('tareas').select('*').eq('user_id', u.id)
      .in('tipo', ['prueba','entrega','quiz']).gte('fecha', hoy)
      .order('fecha', { ascending: true })
    if (!error) setUpcomingEvals(data ?? [])
  }, [])

  useEffect(() => { if (ready) cargarEvals() }, [ready, cargarEvals])

  // ── Notas ─────────────────────────────────────────────────────────────────
  const cargarNotas = useCallback(async () => {
    setLoadNotas(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadNotas(false); return }
    const { data, error } = await supabase
      .from('notas').select('*').eq('user_id', u.id)
      .order('created_at', { ascending: false })
    if (!error) setAllNotas(data ?? [])
    setLoadNotas(false)
  }, [])

  useEffect(() => { if (ready) cargarNotas() }, [ready, cargarNotas])

  // ── Actions ───────────────────────────────────────────────────────────────
  async function toggleTarea(id, completada) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, completada: !completada } : t))
    const { error } = await supabase.from('tareas').update({ completada: !completada }).eq('id', id)
    if (error) { setTareas(prev => prev.map(t => t.id === id ? { ...t, completada } : t)); console.error(error) }
  }

  async function eliminarTarea(id) {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    setTareas(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tareas').delete().eq('id', id)
    if (error) { console.error(error); cargarTareas() }
    else { cargarCalendario(); cargarEvals() }
  }

  async function actualizarTarea(id, updates) {
    const { error } = await supabase.from('tareas').update(updates).eq('id', id)
    if (!error) { setEditTareaData(null); cargarTareas(); cargarCalendario(); cargarEvals() }
    else console.error(error)
  }

  async function crearTarea() {
    if (!tituloTarea.trim()) return
    setCreandoTarea(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const hoy = new Date().toISOString().slice(0,10)
    const fechaFinal = fechaTarea || hoy
    const { error } = await supabase.from('tareas').insert({
      user_id: u.id, titulo: tituloTarea.trim(), materia: materiaTarea,
      tipo: tipoTarea, duracion_min: Number(duracionTarea) || 30,
      hora: horaTarea || null, completada: false, fecha: fechaFinal,
    })
    if (!error) {
      setTituloTarea(''); setTipoTarea('tarea')
      setFechaTarea(''); setDuracionTarea(30); setHoraTarea('')
      setTareaModalOpen(false)
      if (fechaFinal === hoy) cargarTareas()
      cargarCalendario(); cargarEvals()
    } else console.error(error)
    setCreandoTarea(false)
  }

  async function guardarNota() {
    if (!titulo.trim() || !contenido.trim()) { alert('Completa los campos'); return }
    setGuardando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notas').insert({ titulo, contenido, materia, user_id: u.id })
    if (!error) { setTitulo(''); setContenido(''); setModalOpen(false); cargarNotas() }
    else console.error(error)
    setGuardando(false)
  }

  async function eliminarNota(id) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    setAllNotas(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) { console.error(error); cargarNotas() }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) return null

  const remaining    = tareas.filter(t => !t.completada).length
  const totalMinutes = tareas.filter(t => !t.completada).reduce((s, t) => s + (t.duracion_min || 0), 0)
  const todayStr     = new Date().toISOString().slice(0,10)
  const thisWeekTests= weekTareas.filter(t => ['prueba','quiz'].includes(t.tipo)).length
  const weekDays     = [...new Set(weekTareas.map(t => t.fecha))].sort()

  function weekDayLabel(fecha) {
    const d = new Date(fecha + 'T12:00:00')
    return { wd: WEEKDAYS_ES[d.getDay()], day: d.getDate() }
  }

  function urgentDays(e) {
    const d = new Date(e.fecha + 'T12:00:00')
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return Math.round((d - hoy) / 86400000)
  }

  return (
    <>
      <Topbar user={user} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} onLogout={cerrarSesion} />

      <main className="dash-body">

        {/* Alert banner */}
        {urgentEval && !dismissedAlert && (
          <div className="alert-banner">
            <span className="alert-icon">⚡</span>
            <span>
              Tienes una <strong>{TIPO_LABEL[urgentEval.tipo]}</strong> de <strong>{urgentEval.materia}</strong>{' '}
              {daysLabel(urgentDays(urgentEval)).toLowerCase() === 'hoy'
                ? <><strong>hoy</strong>.</>
                : <>en <strong>{urgentDays(urgentEval)} {urgentDays(urgentEval) === 1 ? 'día' : 'días'}</strong>.</>
              }
            </span>
            <button className="alert-dismiss" onClick={() => setDismissedAlert(true)}>×</button>
          </div>
        )}

        {/* Hero */}
        <header className="hero">
          <div>
            <div className="hero-date">{formatDateLong()}</div>
            <h1 className="hero-title">
              Hola, {firstName}.{' '}
              <span className="hero-accent">
                Esta semana tienes <strong>{thisWeekTests} evaluaciones</strong> y{' '}
                {remaining} {remaining === 1 ? 'tarea' : 'tareas'} pendientes para hoy.
              </span>
            </h1>
          </div>
        </header>

        <div className="dash-grid">

          {/* ── Left column ───────────────────────────────────────────────── */}
          <div className="dash-left">

            {/* Hoy */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Hoy</h2>
                {!loadingTareas && tareas.length > 0 && (
                  <span className="link-mini">
                    {remaining} pendiente{remaining !== 1 ? 's' : ''} · {Math.round(totalMinutes/60*10)/10}h estimadas
                  </span>
                )}
                <button className="btn btn-ghost xs" onClick={() => setTareaModalOpen(true)}>
                  <IconPlus /> Tarea
                </button>
              </div>

              {loadingTareas ? <SkeletonTasks /> : tareas.length === 0 ? (
                <div className="task-empty">
                  <span>¡Sin tareas para hoy!</span>
                  <button className="link-mini" onClick={() => setTareaModalOpen(true)}>+ Agregar una</button>
                </div>
              ) : (
                <ul className="task-list">
                  {tareas.map(t => {
                    const color = materiaColor(t.materia)
                    return (
                      <li key={t.id} className={`task ${t.completada ? 'task-done' : ''}`}>
                        <button className={`tcheck ${t.completada ? 'checked' : ''}`}
                          onClick={() => toggleTarea(t.id, t.completada)} aria-label="Marcar">
                          {t.completada && <IconCheck />}
                        </button>
                        <div className="task-main" onClick={() => !t.completada && setEditTareaData(t)}>
                          <div className="task-title">{t.titulo}</div>
                          <div className="task-meta">
                            <span className={`dot dot-${color}`} />
                            <span>{t.materia}</span>
                            {t.tipo && t.tipo !== 'tarea' && (
                              <><span className="meta-sep">·</span>
                              <span className={`pill pill-${TIPO_PILL[t.tipo]}`} style={{fontSize:10,padding:'1px 7px'}}>{TIPO_LABEL[t.tipo]}</span></>
                            )}
                            {t.duracion_min && (
                              <><span className="meta-sep">·</span><span>{t.duracion_min} min</span></>
                            )}
                          </div>
                        </div>
                        {t.hora && <span className="task-time">{t.hora.slice(0,5)}</span>}
                        <button className="task-del-btn" onClick={() => eliminarTarea(t.id)} title="Eliminar">×</button>
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
                <span className="link-mini">{materias.length} asignatura{materias.length !== 1 ? 's' : ''}</span>
              </div>
              {loadNotas && materias.length === 0 ? <SkeletonCards /> : materias.length === 0 ? (
                <EmptyState
                  title="Sin materias todavía"
                  sub="Crea tu primera nota o tarea y tus materias aparecerán aquí automáticamente."
                />
              ) : (
                <div className="subjects-grid">
                  {materias.map(m => (
                    <SubjectCard key={m.nombre} materia={m}
                      onClick={() => router.push(`/materia/${encodeURIComponent(m.nombre)}`)} />
                  ))}
                </div>
              )}
            </section>

            {/* Mis notas */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Mis notas</h2>
                <button className="btn btn-ghost xs" onClick={() => setModalOpen(true)}>
                  <IconPlus /> Nueva
                </button>
              </div>

              {allNotas.length > 0 && (
                <div className="filter-row">
                  <button className={`filter-btn${filtro === '' ? ' activo' : ''}`} onClick={() => setFiltro('')}>Todas</button>
                  {materiasList.map(m => (
                    <button key={m} className={`filter-btn${filtro === m ? ' activo' : ''}`}
                      onClick={() => setFiltro(filtro === m ? '' : m)}>{m}</button>
                  ))}
                </div>
              )}

              {loadNotas ? <SkeletonNotes /> : notasFiltradas.length === 0 ? (
                <EmptyState
                  title={allNotas.length === 0 ? "Aún no tienes notas" : "Sin notas en esta materia"}
                  sub={allNotas.length === 0
                    ? "Usa el botón Nueva o el FAB verde para guardar tu primer apunte."
                    : "Agrega notas a esta materia desde el botón Nueva."}
                />
              ) : (
                <div className="notes-tab">
                  <div className="notes-head">
                    <div className="files-label">{notasFiltradas.length} nota{notasFiltradas.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="notes-grid">
                    {notasFiltradas.map(nota => (
                      <article key={nota.id} className="note-card"
                        onClick={() => router.push(`/materia/${encodeURIComponent(nota.materia || '')}`)}>
                        <div className="note-top">
                          <span className={`pill pill-${materiaColor(nota.materia)}`}>
                            {nota.materia || 'Sin materia'}
                          </span>
                          <button className="note-del-btn"
                            onClick={e => { e.stopPropagation(); eliminarNota(nota.id) }}
                            title="Eliminar nota">×</button>
                        </div>
                        <h3 className="note-title">{nota.titulo}</h3>
                        <p className="note-body">{nota.contenido}</p>
                        <div className="note-foot">
                          <span className="note-date"><IconCalendar /> {formatDate(nota.created_at)}</span>
                          <span className="note-action"><IconFileText /> Abrir →</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>

          {/* ── Right column ──────────────────────────────────────────────── */}
          <aside className="dash-right">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Esta semana</h2>
                  <div className="card-sub">
                    {loadingWeek ? 'Cargando…' : `${weekTareas.length} evento${weekTareas.length !== 1 ? 's' : ''} próximos`}
                  </div>
                </div>
                <button className="icon-btn sm"><IconCalendar /></button>
              </div>
              {loadingWeek ? (
                <div className="skeleton-list">{[1,2].map(i=><div key={i} className="skeleton-task" style={{height:70}}/>)}</div>
              ) : weekTareas.length === 0 ? (
                <div className="task-empty" style={{flexDirection:'column',alignItems:'flex-start',gap:6}}>
                  <span style={{color:'var(--ink-3)'}}>¡Sin evaluaciones próximas!</span>
                  <button className="link-mini" onClick={() => setTareaModalOpen(true)}>+ Agregar una tarea</button>
                </div>
              ) : (
                <ul className="week-list">
                  {weekDays.map(fecha => {
                    const { wd, day } = weekDayLabel(fecha)
                    const isToday = fecha === todayStr
                    const eventos = weekTareas.filter(t => t.fecha === fecha)
                    return eventos.map((ev, i) => {
                      const color     = materiaColor(ev.materia)
                      const pillColor = TIPO_PILL[ev.tipo] || 'c'
                      return (
                        <li key={ev.id} className={`wk ${isToday ? 'wk-today' : ''}`}>
                          <div className="wk-date">
                            {i === 0
                              ? <><div className="wk-wd">{wd}</div><div className="wk-d">{String(day).padStart(2,'0')}</div></>
                              : <><div className="wk-wd"/><div className="wk-d"/></>
                            }
                          </div>
                          <div className="wk-body">
                            <div className="wk-row">
                              <span className={`pill pill-${pillColor}`}>{TIPO_LABEL[ev.tipo] || ev.tipo}</span>
                              {ev.hora && <span className="wk-time">{ev.hora.slice(0,5)}</span>}
                            </div>
                            <div className="wk-title">{ev.titulo}</div>
                            <div className="wk-sub"><span className={`dot dot-${color}`}/>{ev.materia}</div>
                          </div>
                        </li>
                      )
                    })
                  })}
                </ul>
              )}
            </section>
          </aside>

        </div>
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setModalOpen(true)}>
        <IconPlus /><span>Nueva nota</span>
      </button>

      {/* Note modal */}
      {modalOpen && (
        <NoteModal onClose={() => setModalOpen(false)} onSave={guardarNota}
          materia={materia} setMateria={setMateria}
          titulo={titulo} setTitulo={setTitulo}
          contenido={contenido} setContenido={setContenido}
          guardando={guardando} materiasList={materiasList} />
      )}

      {/* Create task modal */}
      {tareaModalOpen && (
        <TareaModal onClose={() => setTareaModalOpen(false)} onSave={crearTarea}
          titulo={tituloTarea} setTitulo={setTituloTarea}
          materia={materiaTarea} setMateria={setMateriaTarea}
          tipo={tipoTarea} setTipo={setTipoTarea}
          fecha={fechaTarea} setFecha={setFechaTarea}
          duracion={duracionTarea} setDuracion={setDuracionTarea}
          hora={horaTarea} setHora={setHoraTarea}
          creando={creandoTarea} materiasList={materiasList} />
      )}

      {/* Edit task modal */}
      {editTareaData && (
        <EditTareaModal tarea={editTareaData}
          onClose={() => setEditTareaData(null)}
          onSave={updates => actualizarTarea(editTareaData.id, updates)}
          materiasList={materiasList} />
      )}
    </>
  )
}
