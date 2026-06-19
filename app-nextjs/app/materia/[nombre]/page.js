'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import {
  getCourseFiles, getCourseModules, getAssignmentsWithSubmissions,
  getCourseAnnouncements, loadCanvasConfig,
} from '@/lib/canvas'

// ── Icons ──────────────────────────────────────────────────────────────────────
function IconBook()      { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }
function IconCalendar()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> }
function IconFileText()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg> }
function IconFolder()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
function IconBell()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> }
function IconStar()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> }
function IconGrades()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> }
function IconCheck()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }
function IconChevron()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function IconX()         { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }
function IconArrowLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function IconSparkle()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/></svg> }
function IconPlus()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IconSave()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconDownload()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IconEye()       { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconMod()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function IconStarFill()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function IconRefresh()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> }

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
function formatAnnouncementDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.round((Date.now() - d) / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}
function daysLabel(n) {
  if (n < 0)  return 'Pasado'
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}
function toNota7(nota, nota_maxima) {
  if (!nota_maxima || nota == null) return null
  return Math.round((1 + (nota / nota_maxima) * 6) * 10) / 10
}
function nota7Color(n) {
  if (n == null) return 'var(--ink-4)'
  if (n >= 5.0) return 'var(--c-b, #22c55e)'
  if (n >= 4.0) return '#ca8a04'
  return 'var(--c-d, #ef4444)'
}
function matchNombres(a, b) {
  const words = s => (s || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const wa = words(a); const wb = words(b)
  return wa.some(w => (b || '').toLowerCase().includes(w)) ||
         wb.some(w => (a || '').toLowerCase().includes(w))
}
function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function fileIcon(mimeClass, contentType) {
  const cls = (mimeClass || '').toLowerCase()
  const ct  = (contentType || '').toLowerCase()
  if (cls === 'pdf' || ct.includes('pdf')) return '📄'
  if (cls === 'image' || ct.includes('image')) return '🖼️'
  if (cls === 'video' || ct.includes('video')) return '🎬'
  if (cls === 'audio' || ct.includes('audio')) return '🎵'
  if (ct.includes('word') || ct.includes('document')) return '📝'
  if (ct.includes('sheet') || ct.includes('excel')) return '📊'
  if (ct.includes('presentation') || ct.includes('powerpoint')) return '📊'
  if (ct.includes('zip') || ct.includes('rar') || ct.includes('compressed')) return '🗜️'
  return '📁'
}
function isPdf(f) {
  return f.mime_class === 'pdf' || (f['content-type'] || '').includes('pdf')
}
function isSyllabus(name) {
  const n = (name || '').toLowerCase()
  return n.includes('programa') || n.includes('syllabus') || n.includes('cronograma') ||
    n.includes('planificaci') || n.includes('schedule') || n.includes('guia') || n.includes('guía')
}
function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim()
}
function moduleItemIcon(type) {
  const map = { File:'📄', Assignment:'📝', Discussion:'💬', Quiz:'❓', ExternalUrl:'🔗', Page:'📖' }
  return map[type] || '📌'
}
function handleCanvasError(err) {
  const msg = err?.message || ''
  if (msg.includes('401') || msg.includes('403')) return 'Token inválido. Actualiza tu token en Configuración.'
  if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')) return 'Canvas no responde. Verifica tu conexión.'
  return msg || 'Error al cargar datos de Canvas.'
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
function EmptyState({ title, sub, children }) {
  return (
    <div className="empty">
      <div className="empty-art"><div className="empty-doc"/><div className="empty-doc"/><div className="empty-doc front"/></div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {children}
    </div>
  )
}

// ── Canvas error block ────────────────────────────────────────────────────────
function CanvasError({ msg, onRetry, router }) {
  return (
    <div className="empty" style={{ paddingTop:32 }}>
      <div className="empty-title" style={{ fontSize:15 }}>Sin acceso al contenido</div>
      <div className="empty-sub">{msg}</div>
      <div style={{ display:'flex', gap:8, marginTop:16 }}>
        {onRetry && <button className="btn btn-ghost sm" onClick={onRetry}>Reintentar</button>}
        {(msg.includes('Token') || msg.includes('Configura')) && (
          <button className="btn btn-primary sm" onClick={() => router.push('/configuracion')}>
            Ir a Configuración
          </button>
        )}
      </div>
    </div>
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
          <div><h2 className="card-title">Nuevo apunte</h2><div className="card-sub">{materiaFija}</div></div>
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
            <IconSave />{guardando ? 'Guardando…' : 'Guardar apunte'}
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
          <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={onSave} disabled={creando}>
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

// ── PDF Preview modal ─────────────────────────────────────────────────────────
function PdfModal({ file, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-overlay" style={{ zIndex:1100 }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal" style={{ width:'92vw', maxWidth:960, height:'88vh', padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div className="modal-head" style={{ padding:'10px 16px', flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>
            {file.display_name || file.filename}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {file.url && (
              <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.filename || file.display_name}
                className="btn btn-ghost xs" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                <IconDownload /> Descargar
              </a>
            )}
            <button className="modal-close" onClick={onClose}><IconX /></button>
          </div>
        </div>
        <iframe
          src={file.url}
          title={file.display_name}
          style={{ flex:1, border:'none', display:'block', width:'100%' }}
        />
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
  const [tab,      setTab]      = useState('notas')

  // Materia (includes canvas_id)
  const [canvasId,     setCanvasId]     = useState(null)
  const [canvasConfig, setCanvasConfig] = useState(null)

  // Notas
  const [notas,        setNotas]        = useState([])
  const [loadNotas,    setLoadNotas]    = useState(true)
  const [noteModal,    setNoteModal]    = useState(false)
  const [noteTitulo,   setNoteTitulo]   = useState('')
  const [noteContenido,setNoteContenido]= useState('')
  const [guardando,    setGuardando]    = useState(false)

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

  // Calificaciones de Supabase (para badges en tareas)
  const [califDB, setCalifDB] = useState([])

  // ── Lazy-loaded tabs ───────────────────────────────────────────────────────
  // Material (files + modules)
  const [archivos,       setArchivos]       = useState([])
  const [modulos,        setModulos]        = useState([])
  const [loadMaterial,   setLoadMaterial]   = useState(false)
  const [materialError,  setMaterialError]  = useState('')
  const [materialLoaded, setMaterialLoaded] = useState(false)

  // Calificaciones desde Canvas
  const [canvasGrades,   setCanvasGrades]   = useState([])
  const [loadGrades,     setLoadGrades]     = useState(false)
  const [gradesError,    setGradesError]    = useState('')
  const [gradesLoaded,   setGradesLoaded]   = useState(false)

  // Anuncios desde Canvas
  const [anuncios,       setAnuncios]       = useState([])
  const [loadAnuncios,   setLoadAnuncios]   = useState(false)
  const [anunciosError,  setAnunciosError]  = useState('')
  const [anunciosLoaded, setAnunciosLoaded] = useState(false)

  // PDF preview
  const [pdfFile, setPdfFile] = useState(null)

  // Materia DB id (para calculadora)
  const [materiaDbId, setMateriaDbId] = useState(null)

  // Calculadora de notas
  const [calcRows,    setCalcRows]    = useState([])
  const [calcLoaded,  setCalcLoaded]  = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)

  // Ponderaciones (tabla en Supabase)
  const [ponderacionesDB, setPonderacionesDB]   = useState([])
  const [pondLoaded,      setPondLoaded]        = useState(false)
  const [pondLoading,     setPondLoading]       = useState(false)
  const [pondRows,        setPondRows]          = useState([]) // local edit rows
  const [simuladas7,      setSimuladas7]        = useState({}) // { nombre: nota_7 }
  const [needMode,        setNeedMode]          = useState(false)
  const [savingPonds,     setSavingPonds]       = useState(false)

  // Guards: prevent double-loading per tab
  const loadGuard = useRef({ material: false, grades: false, anuncios: false })

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) {} }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Data from Supabase ────────────────────────────────────────────────────
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

  const cargarCalifDB = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const { data } = await supabase
      .from('calificaciones').select('*')
      .eq('user_id', u.id).eq('materia', nombre)
    if (data) setCalifDB(data)
  }, [nombre])

  const cargarPonderaciones = useCallback(async (dbId) => {
    const mid = dbId || materiaDbId
    if (!mid) return
    setPondLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setPondLoading(false); return }
    const { data } = await supabase.from('ponderaciones').select('*')
      .eq('user_id', u.id).eq('materia_id', mid).order('orden')
    const rows = (data ?? []).map(p => ({ ...p, _local: false }))
    setPonderacionesDB(rows)
    setPondRows(rows)
    setPondLoaded(true)
    setPondLoading(false)
  }, [materiaDbId])

  async function savePonderaciones() {
    if (!materiaDbId) return
    setSavingPonds(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setSavingPonds(false); return }

    // Get existing IDs from DB
    const { data: existingRows } = await supabase.from('ponderaciones')
      .select('id').eq('user_id', u.id).eq('materia_id', materiaDbId)
    const existingIds = new Set((existingRows || []).map(r => r.id))
    const keepIds = new Set(pondRows.filter(r => r.id && !r._local).map(r => r.id))

    // Delete removed rows
    for (const id of existingIds) {
      if (!keepIds.has(id)) {
        await supabase.from('ponderaciones').delete().eq('id', id)
      }
    }

    // Upsert current rows
    for (let i = 0; i < pondRows.length; i++) {
      const r = pondRows[i]
      const payload = {
        user_id: u.id, materia_id: materiaDbId,
        nombre_evaluacion: r.nombre_evaluacion || 'Evaluación',
        porcentaje: Number(r.porcentaje) || 0,
        tipo: r.tipo || 'otro', orden: i,
      }
      if (r.id && !r._local) {
        await supabase.from('ponderaciones').update(payload).eq('id', r.id)
      } else {
        await supabase.from('ponderaciones').insert(payload)
      }
    }

    await cargarPonderaciones(materiaDbId)
    setSavingPonds(false)
  }

  const cargarCalculadora = useCallback(async () => {
    setCalcLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setCalcLoading(false); return }

    // Calificaciones Canvas para esta materia
    const { data: califs } = await supabase
      .from('calificaciones').select('*').eq('user_id', u.id).eq('materia', nombre)

    // Ponderaciones desde análisis de cronogramas
    let cronEvals = []
    if (materiaDbId) {
      const { data: analisis } = await supabase
        .from('analisis_material')
        .select('fechas_evaluaciones')
        .eq('materia_id', materiaDbId)
      if (analisis) {
        cronEvals = analisis
          .flatMap(a => (a.fechas_evaluaciones || []))
          .filter(e => e.ponderacion && e.descripcion)
      }
    }

    // Construir filas a partir de calificaciones reales
    const rows = (califs || []).map(c => ({
      id:           `c-${c.id}`,
      nombre:       c.nombre,
      ponderacion:  null,
      nota_pct:     c.nota_maxima > 0 ? Math.round((c.nota / c.nota_maxima) * 100) : null,
      simulada_pct: null,
      source:       'canvas',
    }))

    // Intentar emparejar ponderaciones del cronograma
    rows.forEach(row => {
      const name = (row.nombre || '').toLowerCase()
      for (const e of cronEvals) {
        const desc = (e.descripcion || '').toLowerCase()
        const matchWords = desc.split(' ').filter(w => w.length > 3)
        if (matchWords.some(w => name.includes(w)) || name.split(' ').some(w => w.length > 3 && desc.includes(w))) {
          row.ponderacion = e.ponderacion
          break
        }
      }
    })

    // Añadir filas del cronograma sin calificacion real todavía
    const usedDescs = new Set(rows.filter(r => r.ponderacion != null).map(r => r.nombre.toLowerCase()))
    for (const e of cronEvals) {
      const desc = (e.descripcion || '').toLowerCase()
      const yaUsada = [...usedDescs].some(u => u.includes(desc.slice(0,6)) || desc.includes(u.slice(0,6)))
      if (!yaUsada) {
        rows.push({
          id:           `e-${Math.random().toString(36).slice(2)}`,
          nombre:       e.descripcion || e.tipo || 'Evaluación',
          ponderacion:  e.ponderacion,
          nota_pct:     null,
          simulada_pct: null,
          source:       'cronograma',
        })
        usedDescs.add(desc)
      }
    }

    setCalcRows(rows)
    setCalcLoaded(true)
    setCalcLoading(false)
  }, [nombre, materiaDbId])

  useEffect(() => {
    if (!ready || !user) return
    // Load canvas_id and materia DB id
    supabase.from('materias').select('id, canvas_id')
      .eq('user_id', user.id).eq('nombre', nombre).maybeSingle()
      .then(({ data }) => {
        if (data?.canvas_id) setCanvasId(data.canvas_id)
        if (data?.id)        setMateriaDbId(data.id)
      })
    // Load Canvas credentials
    loadCanvasConfig(supabase, user.id).then(cfg => { if (cfg) setCanvasConfig(cfg) })
    // Load DB data
    cargarNotas(); cargarTareas(); cargarCalifDB()
  }, [ready, user, nombre, cargarNotas, cargarTareas, cargarCalifDB])

  // ── Canvas lazy loaders ───────────────────────────────────────────────────
  async function doLoadMaterial(courseId) {
    if (loadGuard.current.material) return
    loadGuard.current.material = true
    setLoadMaterial(true); setMaterialError('')
    try {
      const [files, mods] = await Promise.all([
        getCourseFiles(canvasConfig.url, canvasConfig.token, courseId),
        getCourseModules(canvasConfig.url, canvasConfig.token, courseId),
      ])
      setArchivos(Array.isArray(files) ? files : [])
      setModulos(Array.isArray(mods) ? mods : [])
      setMaterialLoaded(true)
    } catch (err) {
      loadGuard.current.material = false
      setMaterialError(handleCanvasError(err))
    }
    setLoadMaterial(false)
  }

  async function doLoadGrades(courseId) {
    if (loadGuard.current.grades) return
    loadGuard.current.grades = true
    setLoadGrades(true); setGradesError('')
    try {
      const data = await getAssignmentsWithSubmissions(canvasConfig.url, canvasConfig.token, courseId)
      setCanvasGrades(Array.isArray(data) ? data : [])
      setGradesLoaded(true)
    } catch (err) {
      loadGuard.current.grades = false
      setGradesError(handleCanvasError(err))
    }
    setLoadGrades(false)
  }

  async function doLoadAnuncios(courseId) {
    if (loadGuard.current.anuncios) return
    loadGuard.current.anuncios = true
    setLoadAnuncios(true); setAnunciosError('')
    try {
      const data = await getCourseAnnouncements(canvasConfig.url, canvasConfig.token, courseId)
      setAnuncios(Array.isArray(data) ? data : [])
      setAnunciosLoaded(true)
    } catch (err) {
      loadGuard.current.anuncios = false
      setAnunciosError(handleCanvasError(err))
    }
    setLoadAnuncios(false)
  }

  // Trigger lazy load when tab or canvas data changes
  useEffect(() => {
    if (!canvasId || !canvasConfig) return
    if (tab === 'material'       && !materialLoaded)  doLoadMaterial(canvasId)
    if (tab === 'calificaciones' && !gradesLoaded)    doLoadGrades(canvasId)
    if (tab === 'anuncios'       && !anunciosLoaded)  doLoadAnuncios(canvasId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, canvasId, canvasConfig?.url])

  useEffect(() => {
    if (tab === 'calculadora' && !calcLoaded && !calcLoading) cargarCalculadora()
  }, [tab, calcLoaded, calcLoading, cargarCalculadora])

  useEffect(() => {
    if (tab === 'calificaciones' && materiaDbId && !pondLoaded && !pondLoading) cargarPonderaciones()
  }, [tab, materiaDbId, pondLoaded, pondLoading, cargarPonderaciones])

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

  if (!ready) return null

  const todayStr   = new Date().toISOString().slice(0,10)
  const tareasVig  = tareas.filter(t => t.fecha >= todayStr).sort((a,b) => a.fecha.localeCompare(b.fecha))
  const tareasPast = tareas.filter(t => t.fecha < todayStr).sort((a,b) => b.fecha.localeCompare(a.fecha))

  const califMap = {}
  califDB.forEach(c => { if (c.canvas_id) califMap[c.canvas_id] = c })

  const califConNota = califDB.filter(c => c.nota != null && c.nota_maxima > 0)
  const promedioCalif7 = califConNota.length > 0
    ? Math.round(califConNota.reduce((s, c) => s + toNota7(c.nota, c.nota_maxima), 0) / califConNota.length * 10) / 10
    : null

  function daysAway(fecha) {
    const d = new Date(fecha + 'T12:00:00')
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return Math.round((d - hoy) / 86400000)
  }

  function gradeBadge(tarea) {
    const c = califMap[tarea.canvas_assignment_id]
    if (!c) return null
    const pct = c.nota_maxima > 0 ? Math.round((c.nota / c.nota_maxima) * 100) : null
    if (pct == null) return null
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:3,
        fontSize:11, padding:'2px 7px', borderRadius:4,
        background: pct >= 70 ? 'var(--c-b-light, #d1fae5)' : 'var(--c-d-light, #ffe4e6)',
        color:      pct >= 70 ? '#065f46' : '#9f1239',
        fontWeight: 600,
      }}>
        <IconStarFill /> {c.nota}/{c.nota_maxima} ({pct}%)
      </span>
    )
  }

  // For material tab
  const syllabusFiles = archivos.filter(f => isSyllabus(f.display_name))
  const otherFiles    = archivos.filter(f => !isSyllabus(f.display_name))

  // For grades tab
  const gradedAssignments   = canvasGrades.filter(a => a.submission?.score != null && a.points_possible > 0)
  const ungradedUpcoming    = canvasGrades.filter(a => a.submission?.score == null && a.due_at && a.due_at > new Date().toISOString())
  const canvasGradeAvg      = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((s, a) => s + (a.submission.score / a.points_possible) * 100, 0) / gradedAssignments.length)
    : null

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
                <div className="subj-stat-label">Apuntes</div>
              </div>
              <div className="subj-stat">
                <div className="subj-stat-num">{tareasVig.length}</div>
                <div className="subj-stat-label">Pendientes</div>
              </div>
              <div className="subj-stat">
                <div className="subj-stat-num">{tareasPast.filter(t => t.completada).length}</div>
                <div className="subj-stat-label">Completadas</div>
              </div>
              {promedioCalif7 != null && (
                <div className="subj-stat">
                  <div className="subj-stat-num" style={{ color: nota7Color(promedioCalif7) }}>
                    {promedioCalif7.toFixed(1)}
                  </div>
                  <div className="subj-stat-label">Promedio</div>
                </div>
              )}
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
            <IconFileText /><span>Apuntes</span>
            <span className="tab-count">{notas.length}</span>
          </button>
          <button className={`tab${tab === 'tareas' ? ' tab-active' : ''}`} onClick={() => setTab('tareas')}>
            <IconCalendar /><span>Tareas</span>
            <span className="tab-count">{tareas.length}</span>
          </button>
          <button className={`tab${tab === 'calificaciones' ? ' tab-active' : ''}`} onClick={() => setTab('calificaciones')}>
            <IconGrades /><span>Calificaciones</span>
            {califDB.length > 0 && <span className="tab-count">{califDB.length}</span>}
          </button>
          <button className={`tab${tab === 'material' ? ' tab-active' : ''}`} onClick={() => setTab('material')}>
            <IconFolder /><span>Material</span>
            {archivos.length > 0 && <span className="tab-count">{archivos.length}</span>}
          </button>
          <button className={`tab${tab === 'anuncios' ? ' tab-active' : ''}`} onClick={() => setTab('anuncios')}>
            <IconBell /><span>Anuncios</span>
            {anuncios.filter(a => a.read_state === 'unread').length > 0 && (
              <span className="tab-count" style={{ background:'var(--c-d)', color:'#fff' }}>
                {anuncios.filter(a => a.read_state === 'unread').length}
              </span>
            )}
          </button>
        </div>

        {/* Tab panel */}
        <div className="tab-panel">

          {/* ── NOTAS ─────────────────────────────────────────────────────── */}
          {tab === 'notas' && (
            <div className="notes-tab">
              <div className="notes-head">
                <div className="files-label">{notas.length} apunte{notas.length !== 1 ? 's' : ''}</div>
                <button className="btn btn-ghost xs" onClick={() => setNoteModal(true)}>
                  <IconPlus /> Nuevo apunte
                </button>
              </div>
              {loadNotas ? <SkeletonNotes /> : notas.length === 0 ? (
                <EmptyState title="Sin apuntes aún"
                  sub="Anota fórmulas, dudas o resúmenes que necesites recordar de esta materia.">
                  <button className="btn btn-primary sm" style={{ marginTop:16 }} onClick={() => setNoteModal(true)}>
                    <IconPlus /> Crear primer apunte
                  </button>
                </EmptyState>
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

          {/* ── TAREAS ────────────────────────────────────────────────────── */}
          {tab === 'tareas' && (
            <div>
              <div className="section-head" style={{ marginBottom:20 }}>
                <div className="files-label">{tareas.length} entrada{tareas.length !== 1 ? 's' : ''}</div>
                <button className="btn btn-ghost xs" onClick={() => setTareaModal(true)}>
                  <IconPlus /> Nueva tarea
                </button>
              </div>
              {loadTareas ? <SkeletonTasks /> : tareas.length === 0 ? (
                <EmptyState title="Sin tareas aún"
                  sub="Agrega pruebas, entregas, lecturas o tareas para planificar tu semana.">
                  <button className="btn btn-primary sm" style={{ marginTop:16 }} onClick={() => setTareaModal(true)}>
                    <IconPlus /> Agregar primera tarea
                  </button>
                </EmptyState>
              ) : (
                <>
                  {tareasVig.length > 0 && (
                    <div style={{ marginBottom:36 }}>
                      <div className="eyebrow" style={{ marginBottom:12 }}>Próximas</div>
                      <ul className="task-list">
                        {tareasVig.map(t => {
                          const days = daysAway(t.fecha)
                          const urgent = days <= 3
                          const pillColor = TIPO_PILL[t.tipo] || 'c'
                          const badge = gradeBadge(t)
                          return (
                            <li key={t.id} className={`task ${t.completada ? 'task-done' : ''}`}>
                              <button className={`tcheck ${t.completada ? 'checked' : ''}`}
                                onClick={() => toggleTarea(t.id, t.completada)}><IconCheck /></button>
                              <div className="task-main" onClick={() => !t.completada && setEditTarea(t)}>
                                <div className="task-title">{t.titulo}</div>
                                <div className="task-meta" style={{ flexWrap:'wrap', gap:4 }}>
                                  <span className={`pill pill-${pillColor}`} style={{fontSize:10,padding:'1px 7px'}}>{TIPO_LABEL[t.tipo]||t.tipo}</span>
                                  <span className="meta-sep">·</span>
                                  <span>{formatShort(t.fecha)}</span>
                                  {t.duracion_min && <><span className="meta-sep">·</span><span>{t.duracion_min} min</span></>}
                                  {badge && <>{badge}</>}
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
                      <div className="eyebrow" style={{ marginBottom:12 }}>Historial</div>
                      <ul className="task-list">
                        {tareasPast.map(t => {
                          const pillColor = TIPO_PILL[t.tipo] || 'c'
                          const badge = gradeBadge(t)
                          return (
                            <li key={t.id} className="task task-done">
                              <button className="tcheck checked"><IconCheck /></button>
                              <div className="task-main">
                                <div className="task-title">{t.titulo}</div>
                                <div className="task-meta" style={{ flexWrap:'wrap', gap:4 }}>
                                  <span className={`pill pill-${pillColor}`} style={{fontSize:10,padding:'1px 7px'}}>{TIPO_LABEL[t.tipo]||t.tipo}</span>
                                  <span className="meta-sep">·</span>
                                  <span>{formatShort(t.fecha)}</span>
                                  {badge && <>{badge}</>}
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

          {/* ── CALIFICACIONES ────────────────────────────────────────────── */}
          {tab === 'calificaciones' && (() => {
            // Merge ponderaciones + calificaciones into display rows
            const mergedRows = (() => {
              const califs = califDB.filter(c => c.nota != null && c.nota_maxima > 0)
              const usedCalifIds = new Set()
              const rows = []

              // Rows from ponderaciones table (with matched calificacion if any)
              for (const p of pondRows) {
                const match = califs.find(c => !usedCalifIds.has(c.id) && matchNombres(p.nombre_evaluacion, c.nombre))
                if (match) usedCalifIds.add(match.id)
                rows.push({
                  key:       p.id || p._tmpId || p.nombre_evaluacion,
                  nombre:    p.nombre_evaluacion,
                  pond:      p.porcentaje,
                  nota_7:    match ? toNota7(match.nota, match.nota_maxima) : null,
                  nota_raw:  match ? `${match.nota}/${match.nota_maxima}` : null,
                  fecha:     match?.fecha || null,
                  pond_id:   p.id,
                  calif_id:  match?.id || null,
                  _local:    !!p._local,
                })
              }

              // Remaining calificaciones without a matching ponderacion
              for (const c of califs) {
                if (!usedCalifIds.has(c.id)) {
                  rows.push({
                    key:      c.id,
                    nombre:   c.nombre,
                    pond:     null,
                    nota_7:   toNota7(c.nota, c.nota_maxima),
                    nota_raw: `${c.nota}/${c.nota_maxima}`,
                    fecha:    c.fecha,
                    pond_id:  null,
                    calif_id: c.id,
                    _local:   false,
                  })
                }
              }
              return rows
            })()

            const rowsConNota   = mergedRows.filter(r => r.nota_7 != null && r.pond != null)
            const rowsConSim    = mergedRows.filter(r => r.nota_7 == null && simuladas7[r.nombre] != null && r.pond != null)
            const pondTotal     = pondRows.reduce((s, p) => s + (Number(p.porcentaje) || 0), 0)
            const pondWarn      = pondRows.length > 0 && Math.abs(pondTotal - 100) > 1

            const promedioReal7 = rowsConNota.length > 0
              ? rowsConNota.reduce((s, r) => s + r.nota_7 * r.pond / 100, 0) : null

            const promedioSim7 = (rowsConNota.length > 0 || rowsConSim.length > 0) &&
              (rowsConNota.length + rowsConSim.length) > 0
              ? [...rowsConNota, ...rowsConSim].reduce((s, r) => {
                  const nota = r.nota_7 ?? simuladas7[r.nombre]
                  return s + nota * r.pond / 100
                }, 0)
              : null

            // "¿Qué necesito?" calculation
            const pendientesPond = pondRows
              .filter(p => !mergedRows.find(r => r.pond_id === p.id && r.nota_7 != null))
              .reduce((s, p) => s + (Number(p.porcentaje) || 0), 0)
            const earnedSoFar   = promedioReal7 != null
              ? rowsConNota.reduce((s, r) => s + r.nota_7 * r.pond / 100, 0) : 0
            const neededAvg     = pendientesPond > 0
              ? (4.0 - earnedSoFar) / (pendientesPond / 100) : null

            const thS  = { padding:'7px 10px', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-4)', borderBottom:'2px solid var(--border,#e8e6e1)', whiteSpace:'nowrap' }
            const tdS  = { padding:'9px 10px', borderBottom:'1px solid var(--border-subtle,#f0ede8)', verticalAlign:'middle', fontSize:13 }
            const inpS = { width:'100%', border:'1px solid var(--border)', borderRadius:6, padding:'3px 8px', fontSize:13, background:'transparent', outline:'none', textAlign:'center' }

            return (
              <div>
                {/* Top bar */}
                <div className="section-head" style={{ marginBottom:20 }}>
                  <div>
                    <div className="files-label">Calificaciones — Escala 1.0 a 7.0</div>
                    <div style={{ fontSize:12, color:'var(--ink-4)', marginTop:2 }}>
                      Nota mínima de aprobación: 4.0 · {califDB.filter(c => c.nota != null).length} calificacion{califDB.filter(c => c.nota != null).length !== 1 ? 'es' : ''} importada{califDB.filter(c => c.nota != null).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="btn btn-ghost xs" style={{ fontSize:11 }}
                      onClick={() => setNeedMode(m => !m)}>
                      {needMode ? 'Ocultar' : '¿Qué necesito?'}
                    </button>
                    <button className="btn btn-ghost xs" onClick={() => setPondRows(p => [...p, {
                      _local: true, _tmpId: `tmp-${Date.now()}`,
                      nombre_evaluacion: 'Nueva evaluación', porcentaje: 0, tipo: 'otro', orden: p.length,
                    }])}>
                      <IconPlus /> Agregar
                    </button>
                    <button className="btn btn-primary xs" onClick={savePonderaciones} disabled={savingPonds}>
                      <IconSave />{savingPonds ? 'Guardando…' : 'Guardar ponderaciones'}
                    </button>
                  </div>
                </div>

                {/* Promedio banner */}
                {(promedioReal7 != null || promedioSim7 != null) && (
                  <div style={{ display:'flex', gap:24, padding:'16px 20px', background:'var(--surface-2,#f8f8f6)', borderRadius:12, marginBottom:20, border:'1px solid var(--border,#e8e6e1)', flexWrap:'wrap' }}>
                    {promedioReal7 != null && (
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-4)', marginBottom:3 }}>Promedio actual</div>
                        <div style={{ fontSize:32, fontWeight:700, lineHeight:1, color: nota7Color(promedioReal7) }}>{promedioReal7.toFixed(1)}</div>
                        <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:3 }}>{rowsConNota.length} eval. calificada{rowsConNota.length !== 1 ? 's' : ''} · {rowsConNota.reduce((s,r)=>s+r.pond,0)}% ponderado</div>
                      </div>
                    )}
                    {promedioSim7 != null && rowsConSim.length > 0 && (
                      <>
                        {promedioReal7 != null && <div style={{ width:1, alignSelf:'stretch', background:'var(--border)' }} />}
                        <div>
                          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-4)', marginBottom:3 }}>Promedio simulado</div>
                          <div style={{ fontSize:32, fontWeight:700, lineHeight:1, color: nota7Color(promedioSim7) }}>{promedioSim7.toFixed(1)}</div>
                          <div style={{ fontSize:11, color:'#92400e', marginTop:3 }}>con {rowsConSim.length} nota{rowsConSim.length !== 1 ? 's' : ''} simulada{rowsConSim.length !== 1 ? 's' : ''}</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ¿Qué necesito? */}
                {needMode && pondRows.length > 0 && (
                  <div style={{ padding:'14px 18px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a', marginBottom:20, fontSize:13 }}>
                    <div style={{ fontWeight:600, marginBottom:6 }}>¿Qué necesito para aprobar (4.0)?</div>
                    {neededAvg == null && <div style={{ color:'var(--ink-3)' }}>No hay evaluaciones pendientes con ponderación definida.</div>}
                    {neededAvg != null && neededAvg <= 1.0 && <div style={{ color:'var(--c-b)' }}>¡Ya apruebas aunque saques 1.0 en todo lo que resta!</div>}
                    {neededAvg != null && neededAvg > 7.0 && <div style={{ color:'var(--c-d)' }}>Ya no es posible llegar a 4.0 en las evaluaciones restantes ({pendientesPond}% ponderado).</div>}
                    {neededAvg != null && neededAvg > 1.0 && neededAvg <= 7.0 && (
                      <div>Necesitas sacar en promedio{' '}
                        <strong style={{ color: nota7Color(neededAvg), fontSize:15 }}>{neededAvg.toFixed(1)}</strong>
                        {' '}en las evaluaciones pendientes ({pendientesPond.toFixed(0)}% de ponderación restante).
                      </div>
                    )}
                  </div>
                )}

                {/* Ponderaciones warning */}
                {pondWarn && (
                  <div style={{ fontSize:12, color:'#92400e', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'7px 12px', marginBottom:14 }}>
                    Las ponderaciones suman {pondTotal.toFixed(0)}% (deberían sumar 100%).
                  </div>
                )}

                {/* Loading */}
                {pondLoading && (
                  <div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton-task"/>)}</div>
                )}

                {/* Table */}
                {!pondLoading && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr>
                          <th style={{ ...thS, textAlign:'left' }}>Evaluación</th>
                          <th style={{ ...thS, textAlign:'center', width:80 }}>Pond. %</th>
                          <th style={{ ...thS, textAlign:'center', width:90 }}>Nota real</th>
                          <th style={{ ...thS, textAlign:'center', width:90 }}>Simular</th>
                          <th style={{ ...thS, textAlign:'center', width:80 }}>Aporte</th>
                          <th style={{ ...thS, width:32 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {mergedRows.length === 0 && pondRows.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding:'36px 10px' }}>
                              <div style={{ textAlign:'center', color:'var(--ink-4)', fontSize:13 }}>
                                <div style={{ fontSize:28, marginBottom:10 }}>📊</div>
                                <div style={{ fontWeight:500, color:'var(--ink-2)', marginBottom:6 }}>Sin calificaciones aún</div>
                                <div style={{ marginBottom:14, fontSize:12 }}>
                                  Sincroniza Canvas desde el panel principal para importar notas, o agrega ponderaciones manualmente con "Agregar".
                                </div>
                                <button className="btn btn-ghost xs" onClick={() => setPondRows(p => [...p, {
                                  _local: true, _tmpId: `tmp-${Date.now()}`,
                                  nombre_evaluacion: 'Evaluación 1', porcentaje: 30, tipo: 'otro', orden: 0,
                                }])}>
                                  <IconPlus /> Agregar primera ponderación
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {mergedRows.map((row, i) => {
                          const nota7   = row.nota_7
                          const sim7    = simuladas7[row.nombre]
                          const usada7  = nota7 ?? sim7
                          const aporte  = usada7 != null && row.pond != null ? usada7 * row.pond / 100 : null
                          const isLocal = !row.pond_id
                          return (
                            <tr key={row.key}>
                              <td style={{ ...tdS, textAlign:'left' }}>
                                <div style={{ fontWeight: nota7 != null ? 500 : 400 }}>{row.nombre}</div>
                                {row.nota_raw && <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:1 }}>{row.nota_raw} pts · {row.fecha ? formatShort(row.fecha) : ''}</div>}
                                {isLocal && <span style={{ fontSize:10, color:'var(--ink-4)' }}>sin ponderación</span>}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                {row.pond_id != null ? (
                                  <input type="number" min="0" max="100" placeholder="0"
                                    value={pondRows.find(p => p.id === row.pond_id || p._tmpId === row.pond_id)?.porcentaje ?? ''}
                                    onChange={e => setPondRows(prev => prev.map(p =>
                                      (p.id === row.pond_id || p._tmpId === row.pond_id)
                                        ? { ...p, porcentaje: e.target.value !== '' ? Number(e.target.value) : 0 }
                                        : p
                                    ))}
                                    style={{ ...inpS, width:56 }} />
                                ) : (
                                  <span style={{ color:'var(--ink-5)' }}>—</span>
                                )}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                {nota7 != null ? (
                                  <span style={{ fontWeight:700, color: nota7Color(nota7) }}>{nota7.toFixed(1)}</span>
                                ) : (
                                  <span style={{ color:'var(--ink-5)' }}>—</span>
                                )}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                {nota7 == null ? (
                                  <input type="number" min="1" max="7" step="0.1" placeholder="1–7"
                                    value={sim7 ?? ''}
                                    onChange={e => setSimuladas7(prev => ({
                                      ...prev,
                                      [row.nombre]: e.target.value !== '' ? Number(e.target.value) : undefined,
                                    }))}
                                    style={{ ...inpS, width:60, background: sim7 != null ? '#fef3c7' : 'transparent' }} />
                                ) : (
                                  <span style={{ color:'var(--ink-5)' }}>—</span>
                                )}
                              </td>
                              <td style={{ ...tdS, textAlign:'center', fontWeight:600,
                                color: aporte == null ? 'var(--ink-5)' : nota7 == null ? '#92400e' : 'var(--ink-1)' }}>
                                {aporte != null ? aporte.toFixed(2) : '—'}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                {row.pond_id != null && (
                                  <button onClick={() => setPondRows(prev => prev.filter(p => p.id !== row.pond_id && p._tmpId !== row.pond_id))}
                                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-5)', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {/* pondRows without a match in mergedRows (unmatched ponderaciones) */}
                        {pondRows.filter(p => !mergedRows.find(r => r.pond_id === p.id || r.pond_id === p._tmpId)).map((p) => {
                          const key = p.id || p._tmpId
                          const sim7 = simuladas7[p.nombre_evaluacion]
                          const aporte = sim7 != null ? sim7 * Number(p.porcentaje) / 100 : null
                          return (
                            <tr key={key}>
                              <td style={{ ...tdS, textAlign:'left' }}>
                                <input value={p.nombre_evaluacion}
                                  onChange={e => setPondRows(prev => prev.map(r =>
                                    (r.id === p.id || r._tmpId === p._tmpId) ? { ...r, nombre_evaluacion: e.target.value } : r
                                  ))}
                                  style={{ ...inpS, textAlign:'left', border:'none', padding:'3px 0' }} />
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                <input type="number" min="0" max="100" placeholder="0"
                                  value={p.porcentaje ?? ''}
                                  onChange={e => setPondRows(prev => prev.map(r =>
                                    (r.id === p.id || r._tmpId === p._tmpId)
                                      ? { ...r, porcentaje: e.target.value !== '' ? Number(e.target.value) : 0 } : r
                                  ))}
                                  style={{ ...inpS, width:56 }} />
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}><span style={{ color:'var(--ink-5)' }}>—</span></td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                <input type="number" min="1" max="7" step="0.1" placeholder="1–7"
                                  value={sim7 ?? ''}
                                  onChange={e => setSimuladas7(prev => ({
                                    ...prev,
                                    [p.nombre_evaluacion]: e.target.value !== '' ? Number(e.target.value) : undefined,
                                  }))}
                                  style={{ ...inpS, width:60, background: sim7 != null ? '#fef3c7' : 'transparent' }} />
                              </td>
                              <td style={{ ...tdS, textAlign:'center', fontWeight:600, color: aporte == null ? 'var(--ink-5)' : '#92400e' }}>
                                {aporte != null ? aporte.toFixed(2) : '—'}
                              </td>
                              <td style={{ ...tdS, textAlign:'center' }}>
                                <button onClick={() => setPondRows(prev => prev.filter(r => r.id !== p.id && r._tmpId !== p._tmpId))}
                                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-5)', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── MATERIAL ──────────────────────────────────────────────────── */}
          {tab === 'material' && (
            <div>
              {/* No Canvas connection */}
              {!canvasId && !canvasConfig && (
                <EmptyState title="Sin conexión a Canvas"
                  sub="Configura Canvas en Ajustes para ver el material del curso.">
                  <button className="btn btn-primary sm" style={{ marginTop:16 }}
                    onClick={() => router.push('/configuracion')}>
                    Ir a Configuración
                  </button>
                </EmptyState>
              )}

              {(canvasId || canvasConfig) && loadMaterial && (
                <div className="skeleton-list">
                  {[1,2,3,4,5].map(i => <div key={i} className="skeleton-task" style={{ height:52 }}/>)}
                </div>
              )}

              {(canvasId || canvasConfig) && !loadMaterial && materialError && (
                <CanvasError msg={materialError} router={router}
                  onRetry={() => { loadGuard.current.material = false; setMaterialLoaded(false) }} />
              )}

              {!loadMaterial && !materialError && materialLoaded && (
                <>
                  {/* Módulos del curso */}
                  {modulos.length > 0 && (
                    <div style={{ marginBottom:36 }}>
                      <div className="eyebrow" style={{ marginBottom:12 }}>
                        <IconMod /> Módulos del curso · {modulos.length}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {modulos.map(mod => (
                          <details key={mod.id} style={{
                            border:'1px solid var(--border,#e8e6e1)',
                            borderRadius:10,
                            overflow:'hidden',
                          }}>
                            <summary style={{
                              padding:'12px 16px', cursor:'pointer', userSelect:'none',
                              display:'flex', alignItems:'center', gap:10,
                              background:'var(--surface-2,#f8f8f6)',
                              fontWeight:500, fontSize:14, listStyle:'none',
                            }}>
                              <span style={{ flex:1 }}>{mod.name}</span>
                              {mod.items && <span style={{ fontSize:11, color:'var(--ink-4)' }}>{mod.items.length} elemento{mod.items.length !== 1 ? 's' : ''}</span>}
                              <span style={{ color:'var(--ink-4)', fontSize:12 }}>▸</span>
                            </summary>
                            {mod.items && mod.items.length > 0 && (
                              <ul style={{ listStyle:'none', margin:0, padding:'4px 0', borderTop:'1px solid var(--border,#e8e6e1)' }}>
                                {mod.items.map(item => (
                                  item.type === 'SubHeader'
                                    ? <li key={item.id} style={{ padding:'8px 16px 4px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--ink-4)' }}>
                                        {item.title}
                                      </li>
                                    : <li key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderBottom:'1px solid var(--border-subtle,#f0ede8)' }}>
                                        <span style={{ fontSize:16, flexShrink:0 }}>{moduleItemIcon(item.type)}</span>
                                        <div style={{ flex:1, minWidth:0 }}>
                                          {item.html_url
                                            ? <a href={item.html_url} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize:13, color:'var(--ink-1)', textDecoration:'none' }}
                                                className="mod-item-link">
                                                {item.title}
                                              </a>
                                            : <span style={{ fontSize:13 }}>{item.title}</span>
                                          }
                                        </div>
                                        <span style={{ fontSize:10, textTransform:'uppercase', color:'var(--ink-5)', flexShrink:0 }}>{item.type}</span>
                                      </li>
                                ))}
                              </ul>
                            )}
                            {(!mod.items || mod.items.length === 0) && (
                              <div style={{ padding:'12px 16px', fontSize:13, color:'var(--ink-4)' }}>Sin elementos publicados</div>
                            )}
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archivos */}
                  <div>
                    <div className="eyebrow" style={{ marginBottom:12 }}>
                      Archivos · {archivos.length}
                    </div>

                    {archivos.length === 0 && modulos.length === 0 && (
                      <EmptyState title="Sin material publicado"
                        sub="El profesor aún no ha subido archivos ni módulos a este curso en Canvas. Si sabes que hay material, prueba re-sincronizando desde el panel principal." />
                    )}
                    {archivos.length === 0 && modulos.length > 0 && (
                      <div style={{ fontSize:13, color:'var(--ink-4)', padding:'12px 0' }}>
                        El material está organizado en módulos. Expande cada sección para verlo.
                      </div>
                    )}

                    {/* Syllabus files first */}
                    {syllabusFiles.length > 0 && (
                      <ul className="task-list" style={{ gap:2, marginBottom:12 }}>
                        {syllabusFiles.map(f => (
                          <FileRow key={f.id} f={f} onPreview={isPdf(f) ? () => setPdfFile(f) : null} />
                        ))}
                      </ul>
                    )}

                    {otherFiles.length > 0 && (
                      <ul className="task-list" style={{ gap:2 }}>
                        {otherFiles.map(f => (
                          <FileRow key={f.id} f={f} onPreview={isPdf(f) ? () => setPdfFile(f) : null} />
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ANUNCIOS ──────────────────────────────────────────────────── */}
          {tab === 'anuncios' && (
            <div>
              {!canvasId && !canvasConfig && (
                <EmptyState title="Sin conexión a Canvas"
                  sub="Configura Canvas en Ajustes para ver los anuncios del curso.">
                  <button className="btn btn-primary sm" style={{ marginTop:16 }}
                    onClick={() => router.push('/configuracion')}>
                    Ir a Configuración
                  </button>
                </EmptyState>
              )}

              {(canvasId || canvasConfig) && loadAnuncios && (
                <div className="skeleton-list">
                  {[1,2,3].map(i => <div key={i} className="skeleton-task" style={{ height:100 }}/>)}
                </div>
              )}

              {(canvasId || canvasConfig) && !loadAnuncios && anunciosError && (
                <CanvasError msg={anunciosError} router={router}
                  onRetry={() => { loadGuard.current.anuncios = false; setAnunciosLoaded(false) }} />
              )}

              {!loadAnuncios && !anunciosError && anunciosLoaded && anuncios.length === 0 && (
                <EmptyState title="Sin anuncios"
                  sub="El profesor no ha publicado anuncios en este curso." />
              )}

              {!loadAnuncios && !anunciosError && anunciosLoaded && anuncios.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="files-label" style={{ marginBottom:4 }}>
                    {anuncios.length} anuncio{anuncios.length !== 1 ? 's' : ''}
                    {anuncios.filter(a => a.read_state === 'unread').length > 0 && (
                      <span style={{ marginLeft:8, fontSize:11, color:'var(--c-d)', fontWeight:600 }}>
                        · {anuncios.filter(a => a.read_state === 'unread').length} nuevo{anuncios.filter(a => a.read_state === 'unread').length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {anuncios.map(a => {
                    const preview = stripHtml(a.message).slice(0, 280)
                    const full    = stripHtml(a.message)
                    const hasMore = full.length > 280
                    const isUnread = a.read_state === 'unread'
                    return (
                      <details key={a.id} style={{
                        border:`1px solid ${isUnread ? 'var(--c-b,#3b82f6)' : 'var(--border,#e8e6e1)'}`,
                        borderRadius:12, overflow:'hidden',
                      }}>
                        <summary style={{ padding:'16px 20px', cursor:'pointer', listStyle:'none', userSelect:'none' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                {isUnread && (
                                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'var(--c-b,#3b82f6)', color:'#fff', flexShrink:0 }}>
                                    NUEVO
                                  </span>
                                )}
                                <span style={{ fontSize:14, fontWeight:600, lineHeight:1.3 }}>{a.title}</span>
                              </div>
                              <div style={{ fontSize:12, color:'var(--ink-4)', marginBottom:6 }}>
                                {a.author?.display_name && <><span>{a.author.display_name}</span><span className="meta-sep">·</span></>}
                                <span>{formatAnnouncementDate(a.posted_at)}</span>
                              </div>
                              {preview && (
                                <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                                  {preview}
                                </div>
                              )}
                            </div>
                            <span style={{ color:'var(--ink-4)', fontSize:12, flexShrink:0, marginTop:2 }}>▸</span>
                          </div>
                        </summary>
                        <div style={{ padding:'0 20px 16px', borderTop:'1px solid var(--border-subtle,#f0ede8)' }}>
                          <div style={{ paddingTop:16, fontSize:14, color:'var(--ink-2)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                            {full}
                          </div>
                          {a.html_url && (
                            <a href={a.html_url} target="_blank" rel="noopener noreferrer"
                              className="btn btn-ghost xs" style={{ marginTop:12, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                              Ver en Canvas →
                            </a>
                          )}
                        </div>
                      </details>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setNoteModal(true)}>
        <IconPlus /><span>Nuevo apunte</span>
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

      {pdfFile && <PdfModal file={pdfFile} onClose={() => setPdfFile(null)} />}
    </AppShell>
  )
}

// ── FileRow ───────────────────────────────────────────────────────────────────
// ── CalcPanel ─────────────────────────────────────────────────────────────────
function CalcPanel({ rows, setRows }) {
  const totalPond = rows.reduce((s, r) => s + (r.ponderacion ?? 0), 0)
  const pondWarn  = rows.some(r => r.ponderacion != null) && Math.abs(totalPond - 100) > 1

  const rowsConNota = rows.filter(r => r.nota_pct != null && r.ponderacion != null)
  const promedioReal = rowsConNota.length > 0
    ? rowsConNota.reduce((s, r) => s + r.nota_pct * r.ponderacion / 100, 0)
    : null

  const rowsConCualquier = rows.filter(r => (r.nota_pct != null || r.simulada_pct != null) && r.ponderacion != null)
  const promedioSim = rowsConCualquier.length > 0
    ? rowsConCualquier.reduce((s, r) => s + (r.nota_pct ?? r.simulada_pct) * r.ponderacion / 100, 0)
    : null

  const haySimuladas = rows.some(r => r.simulada_pct != null && r.nota_pct == null)

  function update(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const cellStyle = { padding:'8px 10px', borderBottom:'1px solid var(--border-subtle,#f0ede8)', verticalAlign:'middle' }
  const thStyle   = { padding:'7px 10px', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-4)', borderBottom:'2px solid var(--border,#e8e6e1)' }
  const inputStyle = {
    width:'100%', border:'1px solid var(--border)', borderRadius:6,
    padding:'3px 6px', fontSize:13, background:'transparent',
    outline:'none', textAlign:'center',
  }

  return (
    <div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign:'left' }}>Evaluación</th>
              <th style={{ ...thStyle, textAlign:'center', width:90 }}>Pond. %</th>
              <th style={{ ...thStyle, textAlign:'center', width:95 }}>Nota real</th>
              <th style={{ ...thStyle, textAlign:'center', width:95 }}>Simular %</th>
              <th style={{ ...thStyle, textAlign:'center', width:85 }}>Aporte</th>
              <th style={{ ...thStyle, width:32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cellStyle, textAlign:'center', color:'var(--ink-4)', padding:'28px 10px' }}>
                  Sin datos. Agrega evaluaciones manualmente o sincroniza desde Canvas.
                </td>
              </tr>
            )}
            {rows.map(row => {
              const nota = row.nota_pct
              const sim  = row.simulada_pct
              const pond = row.ponderacion
              const usada = nota ?? sim
              const aporte = usada != null && pond != null
                ? (usada * pond / 100).toFixed(1)
                : null
              const esSimulada = nota == null && sim != null
              return (
                <tr key={row.id}>
                  <td style={{ ...cellStyle, textAlign:'left' }}>
                    <input
                      value={row.nombre}
                      onChange={e => update(row.id, 'nombre', e.target.value)}
                      style={{ ...inputStyle, textAlign:'left', border:'none', padding:'3px 0' }}
                    />
                    {row.source === 'cronograma' && (
                      <span title="Del cronograma analizado" style={{ fontSize:10, color:'var(--ink-4)', marginLeft:4 }}>📅</span>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign:'center' }}>
                    <input
                      type="number" min="0" max="100" placeholder="—"
                      value={pond ?? ''}
                      onChange={e => update(row.id, 'ponderacion', e.target.value !== '' ? Number(e.target.value) : null)}
                      style={{ ...inputStyle, width:60 }}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign:'center' }}>
                    {nota != null ? (
                      <span style={{ fontWeight:600, color: nota >= 60 ? 'var(--c-b)' : 'var(--c-d)' }}>
                        {nota}%
                      </span>
                    ) : (
                      <span style={{ color:'var(--ink-5)', fontSize:12 }}>—</span>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign:'center' }}>
                    {nota == null ? (
                      <input
                        type="number" min="0" max="100" placeholder="0–100"
                        value={sim ?? ''}
                        onChange={e => update(row.id, 'simulada_pct', e.target.value !== '' ? Number(e.target.value) : null)}
                        style={{ ...inputStyle, width:70, background: sim != null ? 'var(--c-a-light,#fef3c7)' : 'transparent' }}
                      />
                    ) : (
                      <span style={{ color:'var(--ink-5)', fontSize:12 }}>—</span>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign:'center', fontWeight:600, color: aporte == null ? 'var(--ink-5)' : esSimulada ? '#92400e' : 'var(--ink-1)' }}>
                    {aporte != null ? `${aporte}%` : '—'}
                  </td>
                  <td style={{ ...cellStyle, textAlign:'center' }}>
                    <button
                      onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-5)', fontSize:18, lineHeight:1, padding:'0 4px' }}
                      title="Eliminar fila"
                    >×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer con cálculos */}
      {rows.length > 0 && (
        <div style={{
          marginTop:16, padding:'16px 20px', borderRadius:12,
          background:'var(--surface-2,#f8f8f6)', border:'1px solid var(--border,#e8e6e1)',
          display:'flex', flexWrap:'wrap', gap:20, alignItems:'flex-start',
        }}>
          {promedioReal != null && (
            <div>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--ink-4)', marginBottom:4 }}>
                Promedio con notas reales
              </div>
              <div style={{ fontSize:28, fontWeight:700, color: promedioReal >= 60 ? 'var(--c-b)' : 'var(--c-d)', lineHeight:1 }}>
                {promedioReal.toFixed(1)}%
              </div>
              <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:3 }}>
                {rowsConNota.length} evaluaci{rowsConNota.length !== 1 ? 'ones' : 'ón'} · {rowsConNota.reduce((s,r) => s + r.ponderacion, 0)}% ponderado
              </div>
            </div>
          )}

          {haySimuladas && promedioSim != null && (
            <>
              {promedioReal != null && <div style={{ width:1, alignSelf:'stretch', background:'var(--border)' }} />}
              <div>
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--ink-4)', marginBottom:4 }}>
                  Proyección (con simuladas)
                </div>
                <div style={{ fontSize:28, fontWeight:700, color:'#92400e', lineHeight:1 }}>
                  {promedioSim.toFixed(1)}%
                </div>
                <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:3 }}>
                  {rowsConCualquier.length} evaluaci{rowsConCualquier.length !== 1 ? 'ones' : 'ón'} · {rowsConCualquier.reduce((s,r) => s + r.ponderacion, 0)}% ponderado
                </div>
              </div>
            </>
          )}

          {promedioReal == null && !haySimuladas && (
            <div style={{ fontSize:13, color:'var(--ink-4)' }}>
              Ingresa ponderaciones (%) y notas o valores simulados para calcular el promedio.
            </div>
          )}

          {pondWarn && (
            <div style={{ width:'100%', fontSize:12, color:'var(--c-d)', marginTop:4 }}>
              ⚠ Las ponderaciones suman {totalPond}% (debería ser 100%).
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FileRow({ f, onPreview }) {
  const syl = isSyllabus(f.display_name)
  return (
    <li className="task" style={{ alignItems:'center' }}>
      <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>
        {syl ? '⭐' : fileIcon(f.mime_class, f['content-type'])}
      </span>
      <div className="task-main">
        <div className="task-title" style={{ fontSize:13 }}>
          {f.display_name}
          {syl && <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px', borderRadius:4, background:'var(--c-a-light,#fef3c7)', color:'#92400e', fontWeight:600 }}>Programa</span>}
        </div>
        <div className="task-meta">
          <span style={{ textTransform:'uppercase', fontSize:10, letterSpacing:'0.05em', color:'var(--ink-4)' }}>
            {f.mime_class || (f['content-type'] || '').split('/').pop() || 'archivo'}
          </span>
          {f.size && <><span className="meta-sep">·</span><span>{formatFileSize(f.size)}</span></>}
          {f.updated_at && <><span className="meta-sep">·</span><span>{formatDate(f.updated_at)}</span></>}
        </div>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {onPreview && (
          <button className="btn btn-ghost xs"
            style={{ display:'inline-flex', alignItems:'center', gap:4 }}
            onClick={onPreview}>
            <IconEye /> Vista previa
          </button>
        )}
        {f.url && (
          <a href={f.url} target="_blank" rel="noopener noreferrer"
            download={f.filename || f.display_name}
            className="btn btn-ghost xs"
            style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:4, textDecoration:'none' }}
            onClick={e => e.stopPropagation()}>
            <IconDownload /> Descargar
          </a>
        )}
      </div>
    </li>
  )
}
