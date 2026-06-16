'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

function IconSearch()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg> }
function IconPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IconCalendar() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> }
function IconSave()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function IconX()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }
function IconChevron()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function IconEdit()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg> }
function IconTrash()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }

function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

function formatFull(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
}
function formatShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function SkeletonNotes() {
  return <div className="skeleton-notes-grid">{[1,2,3,4,5,6].map(i=><div key={i} className="skeleton-note"/>)}</div>
}

export default function NotasPage() {
  const router = useRouter()
  const [user,    setUser]    = useState(null)
  const [ready,   setReady]   = useState(false)

  const [notas,   setNotas]   = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [busqueda,  setBusqueda]  = useState('')
  const [filtroMat, setFiltroMat] = useState('')
  const [orden,     setOrden]     = useState('reciente') // reciente | antigua | az

  // Create modal
  const [crearOpen,    setCrearOpen]    = useState(false)
  const [crearTitulo,  setCrearTitulo]  = useState('')
  const [crearContenido,setCrearContenido]= useState('')
  const [crearMateria, setCrearMateria] = useState('')
  const [guardando,    setGuardando]    = useState(false)

  // Detail/edit modal
  const [notaActiva, setNotaActiva] = useState(null)
  const [editMode,   setEditMode]   = useState(false)
  const [editTitulo, setEditTitulo] = useState('')
  const [editContenido,setEditContenido] = useState('')
  const [editando,   setEditando]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)
      setReady(true)
    })
  }, [router])

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoading(false); return }
    const { data, error } = await supabase
      .from('notas').select('*').eq('user_id', u.id)
      .order('created_at', { ascending: false })
    if (!error) setNotas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (ready) cargar() }, [ready, cargar])

  const materiasList = useMemo(() => [...new Set(notas.map(n => n.materia).filter(Boolean))].sort(), [notas])

  const notasFiltradas = useMemo(() => {
    let res = notas
    if (filtroMat) res = res.filter(n => n.materia === filtroMat)
    if (busqueda)  res = res.filter(n => (n.titulo + ' ' + n.contenido).toLowerCase().includes(busqueda.toLowerCase()))
    if (orden === 'antigua') res = [...res].sort((a,b) => a.created_at.localeCompare(b.created_at))
    if (orden === 'az')      res = [...res].sort((a,b) => (a.titulo||'').localeCompare(b.titulo||''))
    return res
  }, [notas, filtroMat, busqueda, orden])

  async function crearNota() {
    if (!crearTitulo.trim()) { alert('Agrega un título'); return }
    setGuardando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notas').insert({
      titulo: crearTitulo.trim(), contenido: crearContenido,
      materia: crearMateria, user_id: u.id
    })
    if (!error) {
      setCrearTitulo(''); setCrearContenido(''); setCrearOpen(false); cargar()
    } else console.error(error)
    setGuardando(false)
  }

  async function guardarEdicion() {
    setEditando(true)
    const { error } = await supabase.from('notas')
      .update({ titulo: editTitulo, contenido: editContenido, updated_at: new Date().toISOString() })
      .eq('id', notaActiva.id)
    if (!error) {
      setNotaActiva(prev => ({ ...prev, titulo: editTitulo, contenido: editContenido }))
      setNotas(prev => prev.map(n => n.id === notaActiva.id ? { ...n, titulo: editTitulo, contenido: editContenido } : n))
      setEditMode(false)
    } else console.error(error)
    setEditando(false)
  }

  async function eliminarNota(id) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    setNotas(prev => prev.filter(n => n.id !== id))
    setNotaActiva(null)
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) { console.error(error); cargar() }
  }

  function abrirNota(nota) {
    setNotaActiva(nota); setEditMode(false)
    setEditTitulo(nota.titulo); setEditContenido(nota.contenido || '')
  }

  if (!ready) return null

  return (
    <AppShell user={user}>
      <div className="notas-body">
        {/* Header */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:28, gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:32, fontWeight:400, letterSpacing:'-0.025em', marginBottom:4 }}>Mis notas</h1>
            <p style={{ fontSize:14, color:'var(--ink-3)', margin:0 }}>{notas.length} nota{notas.length!==1?'s':''} en total</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCrearOpen(true)}>
            <IconPlus /> Nueva nota
          </button>
        </div>

        {/* Toolbar */}
        <div className="notas-toolbar">
          <div className="search-field">
            <IconSearch />
            <input placeholder="Buscar por título o contenido…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="input-wrap" style={{ width:'auto' }}>
            <select value={filtroMat} onChange={e => setFiltroMat(e.target.value)} style={{ padding:'10px 36px 10px 14px' }}>
              <option value="">Todas las materias</option>
              {materiasList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="select-arrow"><IconChevron /></span>
          </div>
          <div className="input-wrap" style={{ width:'auto' }}>
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{ padding:'10px 36px 10px 14px' }}>
              <option value="reciente">Más recientes</option>
              <option value="antigua">Más antiguas</option>
              <option value="az">A → Z</option>
            </select>
            <span className="select-arrow"><IconChevron /></span>
          </div>
        </div>

        {/* Grid */}
        {loading ? <SkeletonNotes /> : notasFiltradas.length === 0 ? (
          <div className="empty" style={{ marginTop: 16 }}>
            <div className="empty-art"><div className="empty-doc"/><div className="empty-doc"/><div className="empty-doc front"/></div>
            <div className="empty-title">{notas.length === 0 ? 'Aún no tienes notas' : 'Sin resultados'}</div>
            <div className="empty-sub">
              {notas.length === 0 ? 'Crea tu primera nota con el botón de arriba.' : 'Intenta con otra búsqueda o filtro.'}
            </div>
          </div>
        ) : (
          <div className="notes-grid">
            {notasFiltradas.map(nota => (
              <article key={nota.id} className="note-card" onClick={() => abrirNota(nota)}>
                <div className="note-top">
                  <span className={`pill pill-${materiaColor(nota.materia)}`}>{nota.materia || 'Sin materia'}</span>
                  <button className="note-del-btn" onClick={e => { e.stopPropagation(); eliminarNota(nota.id) }}>×</button>
                </div>
                <h3 className="note-title">{nota.titulo}</h3>
                <p className="note-body">{nota.contenido}</p>
                <div className="note-foot">
                  <span className="note-date"><IconCalendar /> {formatShort(nota.created_at)}</span>
                  <span className="note-action">Abrir →</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {crearOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setCrearOpen(false) }}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-head">
              <div><h2 className="card-title">Nueva nota</h2></div>
              <button className="modal-close" onClick={() => setCrearOpen(false)}><IconX /></button>
            </div>
            <div className="card-fields">
              <div className="field">
                <label className="label">Materia</label>
                <div className="input-wrap">
                  {materiasList.length > 0 ? (
                    <><select value={crearMateria} onChange={e => setCrearMateria(e.target.value)}>
                      <option value="">Sin materia</option>
                      {materiasList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select><span className="select-arrow"><IconChevron /></span></>
                  ) : (
                    <input type="text" placeholder="Nombre de la materia"
                      value={crearMateria} onChange={e => setCrearMateria(e.target.value)} style={{paddingLeft:14}} />
                  )}
                </div>
              </div>
              <div className="field">
                <label className="label">Título</label>
                <div className="input-wrap">
                  <input type="text" placeholder="Título de la nota" autoFocus
                    value={crearTitulo} onChange={e => setCrearTitulo(e.target.value)} style={{paddingLeft:14}} />
                </div>
              </div>
              <div className="field">
                <label className="label">Contenido</label>
                <textarea className="note-edit-textarea" placeholder="Escribe tu nota aquí…" rows={8}
                  value={crearContenido} onChange={e => setCrearContenido(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={crearNota} disabled={guardando}>
                <IconSave />{guardando ? 'Guardando…' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/edit modal */}
      {notaActiva && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) { setNotaActiva(null); setEditMode(false) } }}>
          <div className="modal note-detail" style={{ maxWidth:660 }}>
            <div className="modal-head">
              <div style={{ flex:1, minWidth:0 }}>
                {editMode
                  ? <input className="input-wrap" value={editTitulo} onChange={e => setEditTitulo(e.target.value)}
                      style={{width:'100%',padding:'8px 12px',fontSize:18,fontFamily:'var(--font-serif)',fontWeight:500,border:'1px solid var(--border)',borderRadius:'var(--radius)'}} />
                  : <h2 className="card-title" style={{fontSize:22}}>{notaActiva.titulo}</h2>
                }
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                {!editMode && (
                  <>
                    <button className="btn btn-ghost xs" onClick={() => setEditMode(true)}><IconEdit /> Editar</button>
                    <button className="btn btn-ghost xs" style={{color:'var(--danger)'}} onClick={() => eliminarNota(notaActiva.id)}><IconTrash /> Eliminar</button>
                  </>
                )}
                <button className="modal-close" onClick={() => { setNotaActiva(null); setEditMode(false) }}><IconX /></button>
              </div>
            </div>

            <div className="note-detail-meta">
              <span className={`pill pill-${materiaColor(notaActiva.materia)}`} style={{marginRight:8}}>{notaActiva.materia||'Sin materia'}</span>
              Creada {formatFull(notaActiva.created_at)}
              {notaActiva.updated_at && notaActiva.updated_at !== notaActiva.created_at && ` · Editada ${formatFull(notaActiva.updated_at)}`}
            </div>

            {editMode ? (
              <>
                <textarea className="note-edit-textarea" rows={14} value={editContenido}
                  onChange={e => setEditContenido(e.target.value)} autoFocus />
                <div style={{ display:'flex', gap:8, marginTop:14 }}>
                  <button className="btn btn-primary sm" onClick={guardarEdicion} disabled={editando}>
                    <IconSave />{editando ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button className="btn btn-ghost sm" onClick={() => setEditMode(false)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="note-detail-content">{notaActiva.contenido}</div>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setCrearOpen(true)}>
        <IconPlus /><span>Nueva nota</span>
      </button>
    </AppShell>
  )
}
