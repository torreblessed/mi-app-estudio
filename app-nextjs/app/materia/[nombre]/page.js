'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

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
function IconArrowLeft(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function IconSparkle()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/></svg> }

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}
function formatShort(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}
function daysLabel(n) {
  if (n < 0)  return 'Pasado'
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}
function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

const TIPO_PILL  = { tarea:'c', prueba:'d', entrega:'a', lectura:'b', quiz:'e' }
const TIPO_LABEL = { tarea:'Tarea', prueba:'Prueba', entrega:'Entrega', lectura:'Lectura', quiz:'Quiz' }
const TIPOS_FORM  = ['tarea','prueba','entrega','lectura','quiz']

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonNotes() {
  return <div className="skeleton-notes-grid">{[1,2,3].map(i=><div key={i} className="skeleton-note"/>)}</div>
}
function SkeletonTasks() {
  return <div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton-task"/>)}</div>
}

// ── Empty ─────────────────────────────────────────────────────────────────────
function EmptyState({ title, sub }) {
  return (
    <div className="empty">
      <div className="empty-art"><div className="empty-doc"/><div className="empty-doc"/><div className="empty-doc front"/></div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ user, menuOpen, setMenuOpen, menuRef, onLogout, crumb }) {
  const initial     = user?.email ? user.email[0].toUpperCase() : 'U'
  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0] || 'Estudiante'
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-row">
          <div className="brand-mark sm"><IconBook /></div>
          <div className="brand-name sm">Aula</div>
          {crumb && <><span className="crumb-sep">/</span><span className="crumb">{crumb}</span></>}
        </div>
        <div className="topbar-actions">
          <div className="search-mini"><IconSearch /><input placeholder="Buscar…" readOnly /><span className="kbd">⌘K</span></div>
          <button className="icon-btn"><IconBell /><span className="dot-badge"/></button>
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
                <div className="menu-sep"/>
                <button className="menu-item danger" onClick={onLogout}><IconLogout /> Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Note modal ────────────────────────────────────────────────────────────────
function NoteModal({ onClose, onSave, titulo, setTitulo, contenido, setContenido, guardando, materiaFija }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Nueva nota</h2><div className="card-sub">{materiaFija}</div></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label">Título</label>
            <div className="input-wrap">
              <input type="text" placeholder="Título de la nota" value={titulo}
                onChange={e => setTitulo(e.target.value)} style={{paddingLeft:'14px'}} autoFocus />
            </div>
          </div>
          <div className="field">
            <label className="label">Contenido</label>
            <div className="input-wrap textarea-wrap">
              <textarea placeholder="Escribe tu nota aquí…" value={contenido}
                onChange={e => setContenido(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={onSave} disabled={guardando}>
            <IconSave />{guardando ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task modal (crear) ────────────────────────────────────────────────────────
function TareaModal({ onClose, onSave, titulo, setTitulo, tipo, setTipo, fecha, setFecha, hora, setHora, duracion, setDuracion, creando, materiaFija }) {
  const [error, setError] = useState('')
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  function handleSave() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setError(''); onSave()
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Nueva tarea</h2><div className="card-sub">{materiaFija}</div></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label">Título</label>
            <div className="input-wrap" style={error ? {borderColor:'var(--danger)'} : {}}>
              <input type="text" placeholder="¿Qué vas a estudiar?" value={titulo}
                onChange={e => { setTitulo(e.target.value); if(error) setError('') }}
                style={{paddingLeft:'14px'}} autoFocus />
            </div>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Tipo</label>
              <div className="input-wrap">
                <select value={tipo} onChange={e => setTipo(e.target.value)}>
                  {TIPOS_FORM.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
                <span className="select-arrow"><IconChevron /></span>
              </div>
            </div>
            <div className="field">
              <label className="label">Duración (min)</label>
              <div className="input-wrap">
                <input type="number" min="5" step="5" placeholder="30" value={duracion}
                  onChange={e => setDuracion(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Fecha</label>
              <div className="input-wrap">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
            <div className="field">
              <label className="label">Hora</label>
              <div className="input-wrap">
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={handleSave} disabled={creando}>
            <IconSave />{creando ? 'Guardando…' : 'Agregar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit task modal ───────────────────────────────────────────────────────────
function EditTareaModal({ onClose, onSave, tarea }) {
  const [titulo,   setTitulo]   = useState(tarea.titulo || '')
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
    await onSave({ titulo: titulo.trim(), tipo, fecha, hora: hora || null, duracion_min: Number(duracion)||30 })
    setSaving(false)
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div><h2 className="card-title">Editar tarea</h2></div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="card-fields">
          <div className="field">
            <label className="label">Título</label>
            <div className="input-wrap" style={error ? {borderColor:'var(--danger)'} : {}}>
              <input type="text" value={titulo}
                onChange={e => { setTitulo(e.target.value); if(error) setError('') }}
                style={{paddingLeft:'14px'}} autoFocus />
            </div>
            {error && <div className="field-error">{error}</div>}
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Tipo</label>
              <div className="input-wrap">
                <select value={tipo} onChange={e => setTipo(e.target.value)}>
                  {TIPOS_FORM.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
                <span className="select-arrow"><IconChevron /></span>
              </div>
            </div>
            <div className="field">
              <label className="label">Duración (min)</label>
              <div className="input-wrap">
                <input type="number" min="5" step="5" value={duracion}
                  onChange={e => setDuracion(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
          </div>
          <div className="modal-row-2">
            <div className="field">
              <label className="label">Fecha</label>
              <div className="input-wrap">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
            <div className="field">
              <label className="label">Hora</label>
              <div className="input-wrap">
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{paddingLeft:'14px'}} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={handleSave} disabled={saving}>
            <IconSave />{saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MateriaPage() {
  const router  = useRouter()
  const params  = useParams()
  const nombre  = decodeURIComponent(params.nombre ?? '')
  const color   = materiaColor(nombre)
  const menuRef = useRef(null)

  const [ready,    setReady]    = useState(false)
  const [user,     setUser]     = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab,      setTab]      = useState('notas')

  // Notas
  const [notas,      setNotas]      = useState([])
  const [loadNotas,  setLoadNotas]  = useState(true)
  const [noteModal,  setNoteModal]  = useState(false)
  const [noteTitulo, setNoteTitulo] = useState('')
  const [noteContenido, setNoteContenido] = useState('')
  const [guardando,  setGuardando]  = useState(false)

  // Tareas
  const [tareas,     setTareas]     = useState([])
  const [loadTareas, setLoadTareas] = useState(true)
  const [tareaModal, setTareaModal] = useState(false)
  const [editTarea,  setEditTarea]  = useState(null)
  const [tTitulo,    setTTitulo]    = useState('')
  const [tTipo,      setTTipo]      = useState('tarea')
  const [tFecha,     setTFecha]     = useState('')
  const [tHora,      setTHora]      = useState('')
  const [tDuracion,  setTDuracion]  = useState(30)
  const [creando,    setCreando]    = useState(false)

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

  // ── Data ──────────────────────────────────────────────────────────────────
  const cargarNotas = useCallback(async () => {
    setLoadNotas(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadNotas(false); return }
    const { data, error } = await supabase
      .from('notas').select('*').eq('user_id', u.id).eq('materia', nombre)
      .order('created_at', { ascending: false })
    if (!error) setNotas(data ?? [])
    setLoadNotas(false)
  }, [nombre])

  const cargarTareas = useCallback(async () => {
    setLoadTareas(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoadTareas(false); return }
    const { data, error } = await supabase
      .from('tareas').select('*').eq('user_id', u.id).eq('materia', nombre)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true, nullsFirst: false })
    if (!error) setTareas(data ?? [])
    setLoadTareas(false)
  }, [nombre])

  useEffect(() => { if (ready) { cargarNotas(); cargarTareas() } }, [ready, cargarNotas, cargarTareas])

  // ── Actions ───────────────────────────────────────────────────────────────
  async function guardarNota() {
    if (!noteTitulo.trim() || !noteContenido.trim()) { alert('Completa los campos'); return }
    setGuardando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notas').insert({
      titulo: noteTitulo, contenido: noteContenido, materia: nombre, user_id: u.id
    })
    if (!error) { setNoteTitulo(''); setNoteContenido(''); setNoteModal(false); cargarNotas() }
    else console.error(error)
    setGuardando(false)
  }

  async function eliminarNota(id) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    setNotas(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) { console.error(error); cargarNotas() }
  }

  async function crearTarea() {
    if (!tTitulo.trim()) return
    setCreando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const hoy = new Date().toISOString().slice(0,10)
    const { error } = await supabase.from('tareas').insert({
      user_id: u.id, titulo: tTitulo.trim(), materia: nombre, tipo: tTipo,
      duracion_min: Number(tDuracion)||30, hora: tHora||null,
      completada: false, fecha: tFecha||hoy,
    })
    if (!error) {
      setTTitulo(''); setTTipo('tarea'); setTFecha(''); setTHora(''); setTDuracion(30)
      setTareaModal(false); cargarTareas()
    } else console.error(error)
    setCreando(false)
  }

  async function eliminarTarea(id) {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    setTareas(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tareas').delete().eq('id', id)
    if (error) { console.error(error); cargarTareas() }
  }

  async function toggleTarea(id, completada) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, completada: !completada } : t))
    const { error } = await supabase.from('tareas').update({ completada: !completada }).eq('id', id)
    if (error) { setTareas(prev => prev.map(t => t.id === id ? { ...t, completada } : t)); console.error(error) }
  }

  async function actualizarTarea(id, updates) {
    const { error } = await supabase.from('tareas').update(updates).eq('id', id)
    if (!error) { setEditTarea(null); cargarTareas() }
    else console.error(error)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) return null

  const todayStr   = new Date().toISOString().slice(0,10)
  const tareasVig  = tareas.filter(t => t.fecha >= todayStr).sort((a,b) => a.fecha.localeCompare(b.fecha))
  const tareasPast = tareas.filter(t => t.fecha < todayStr).sort((a,b) => b.fecha.localeCompare(a.fecha))

  function daysAway(fecha) {
    const d = new Date(fecha + 'T12:00:00')
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return Math.round((d - hoy) / 86400000)
  }

  return (
    <AppShell user={user}>
      <main className="subj-body">
        <button className="back-btn" onClick={() => router.push('/')}>
          <IconArrowLeft /> Volver al panel
        </button>

        {/* Hero */}
        <header className="subj-hero">
          <div className="subj-hero-left">
            <div className="subj-meta-row">
              <span className={`dot dot-${color}`} />
              <span>{nombre}</span>
            </div>
            <h1 className="subj-h1">{nombre}</h1>
          </div>
          <div className="subj-hero-right">
            <div className="subj-stats-row">
              <div className="subj-stat">
                <div className="subj-stat-num">{notas.length}</div>
                <div className="subj-stat-label">Notas</div>
              </div>
              <div className="subj-stat">
                <div className="subj-stat-num">{tareasVig.length}</div>
                <div className="subj-stat-label">Pendientes</div>
              </div>
              <div className="subj-stat">
                <div className="subj-stat-num">{tareasPast.filter(t => t.completada).length}</div>
                <div className="subj-stat-label">Completadas</div>
              </div>
            </div>
          </div>
        </header>

        {/* AI Tutor banner */}
        <div className="tutor-banner">
          <div className="tutor-banner-left">
            <div className="tutor-banner-title">Tutor IA</div>
            <div className="tutor-banner-sub">Prepara evaluaciones, resuelve dudas y genera resúmenes con IA.</div>
          </div>
          <button className="btn btn-primary sm"
            onClick={() => router.push(`/materia/${encodeURIComponent(nombre)}/tutor`)}>
            <IconSparkle /> Abrir tutor
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${tab === 'notas' ? ' tab-active' : ''}`} onClick={() => setTab('notas')}>
            <IconFileText /><span>Notas</span>
            <span className="tab-count">{notas.length}</span>
          </button>
          <button className={`tab${tab === 'tareas' ? ' tab-active' : ''}`} onClick={() => setTab('tareas')}>
            <IconCalendar /><span>Tareas y evaluaciones</span>
            <span className="tab-count">{tareas.length}</span>
          </button>
        </div>

        {/* Tab panel */}
        <div className="tab-panel">

          {/* ── Notas ──────────────────────────────────────────────────────── */}
          {tab === 'notas' && (
            <div className="notes-tab">
              <div className="notes-head">
                <div className="files-label">{notas.length} nota{notas.length !== 1 ? 's' : ''}</div>
                <button className="btn btn-ghost xs" onClick={() => setNoteModal(true)}>
                  <IconPlus /> Nueva nota
                </button>
              </div>
              {loadNotas ? <SkeletonNotes /> : notas.length === 0 ? (
                <EmptyState title="Sin notas aún"
                  sub="Anota fórmulas, dudas o resúmenes que necesites recordar de esta materia." />
              ) : (
                <div className="notes-grid">
                  {notas.map(n => (
                    <article key={n.id} className="note-card">
                      <div className="note-top">
                        <span className={`pill pill-${color}`}>{nombre}</span>
                        <button className="note-del-btn"
                          onClick={e => { e.stopPropagation(); eliminarNota(n.id) }}
                          title="Eliminar">×</button>
                      </div>
                      <h3 className="note-title">{n.titulo}</h3>
                      <p className="note-body">{n.contenido}</p>
                      <div className="note-foot">
                        <span className="note-date"><IconCalendar /> {formatDate(n.created_at)}</span>
                        <span className="note-action"><IconFileText /> Abrir →</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tareas ─────────────────────────────────────────────────────── */}
          {tab === 'tareas' && (
            <div>
              <div className="section-head" style={{ marginBottom: 20 }}>
                <div className="files-label">{tareas.length} entrada{tareas.length !== 1 ? 's' : ''}</div>
                <button className="btn btn-ghost xs" onClick={() => setTareaModal(true)}>
                  <IconPlus /> Nueva tarea
                </button>
              </div>

              {loadTareas ? <SkeletonTasks /> : tareas.length === 0 ? (
                <EmptyState title="Sin tareas aún"
                  sub="Agrega pruebas, entregas, lecturas o tareas para esta materia." />
              ) : (
                <>
                  {tareasVig.length > 0 && (
                    <div style={{ marginBottom: 36 }}>
                      <div className="eyebrow" style={{ marginBottom: 12 }}>Próximas</div>
                      <ul className="task-list">
                        {tareasVig.map(t => {
                          const days = daysAway(t.fecha)
                          const urgent = days <= 3
                          const pillColor = TIPO_PILL[t.tipo] || 'c'
                          return (
                            <li key={t.id} className={`task ${t.completada ? 'task-done' : ''}`}>
                              <button className={`tcheck ${t.completada ? 'checked' : ''}`}
                                onClick={() => toggleTarea(t.id, t.completada)}><IconCheck /></button>
                              <div className="task-main" onClick={() => !t.completada && setEditTarea(t)}>
                                <div className="task-title">{t.titulo}</div>
                                <div className="task-meta">
                                  <span className={`pill pill-${pillColor}`} style={{fontSize:10,padding:'1px 7px'}}>{TIPO_LABEL[t.tipo]||t.tipo}</span>
                                  <span className="meta-sep">·</span>
                                  <span>{formatShort(t.fecha)}</span>
                                  {t.duracion_min && <><span className="meta-sep">·</span><span>{t.duracion_min} min</span></>}
                                </div>
                              </div>
                              <span className={urgent ? 'urgent-text' : 'task-time'}>{daysLabel(days)}</span>
                              <button className="task-del-btn" onClick={() => eliminarTarea(t.id)} title="Eliminar">×</button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {tareasPast.length > 0 && (
                    <div>
                      <div className="eyebrow" style={{ marginBottom: 12 }}>Historial</div>
                      <ul className="task-list">
                        {tareasPast.map(t => {
                          const pillColor = TIPO_PILL[t.tipo] || 'c'
                          return (
                            <li key={t.id} className="task task-done">
                              <button className="tcheck checked"><IconCheck /></button>
                              <div className="task-main">
                                <div className="task-title">{t.titulo}</div>
                                <div className="task-meta">
                                  <span className={`pill pill-${pillColor}`} style={{fontSize:10,padding:'1px 7px'}}>{TIPO_LABEL[t.tipo]||t.tipo}</span>
                                  <span className="meta-sep">·</span>
                                  <span>{formatShort(t.fecha)}</span>
                                </div>
                              </div>
                              <button className="task-del-btn" onClick={() => eliminarTarea(t.id)} title="Eliminar">×</button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setNoteModal(true)}>
        <IconPlus /><span>Nueva nota</span>
      </button>

      {noteModal && (
        <NoteModal onClose={() => setNoteModal(false)} onSave={guardarNota}
          materiaFija={nombre} titulo={noteTitulo} setTitulo={setNoteTitulo}
          contenido={noteContenido} setContenido={setNoteContenido} guardando={guardando} />
      )}

      {tareaModal && (
        <TareaModal onClose={() => setTareaModal(false)} onSave={crearTarea}
          materiaFija={nombre} titulo={tTitulo} setTitulo={setTTitulo}
          tipo={tTipo} setTipo={setTTipo} fecha={tFecha} setFecha={setTFecha}
          hora={tHora} setHora={setTHora} duracion={tDuracion} setDuracion={setTDuracion}
          creando={creando} />
      )}

      {editTarea && (
        <EditTareaModal tarea={editTarea}
          onClose={() => setEditTarea(null)}
          onSave={updates => actualizarTarea(editTarea.id, updates)} />
      )}
    </AppShell>
  )
}
