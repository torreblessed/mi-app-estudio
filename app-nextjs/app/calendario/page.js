'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

function IconChevronLeft() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function IconChevronRight(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function IconPlus()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IconX()           { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }
function IconChevron()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function IconSave()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }

const TIPO_PILL  = { tarea:'c', prueba:'d', entrega:'a', lectura:'b', quiz:'e' }
const TIPO_LABEL = { tarea:'Tarea', prueba:'Prueba', entrega:'Entrega', lectura:'Lectura', quiz:'Quiz' }
const TIPOS_FORM  = ['tarea','prueba','entrega','lectura','quiz']
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay() }

export default function CalendarioPage() {
  const router = useRouter()
  const [user,    setUser]    = useState(null)
  const [ready,   setReady]   = useState(false)
  const [tareas,  setTareas]  = useState([])
  const [loading, setLoading] = useState(true)

  const today    = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Create event modal
  const [crearOpen,  setCrearOpen]  = useState(false)
  const [crearDia,   setCrearDia]   = useState('')
  const [crearTitulo,setCrearTitulo]= useState('')
  const [crearMat,   setCrearMat]   = useState('')
  const [crearTipo,  setCrearTipo]  = useState('tarea')
  const [crearHora,  setCrearHora]  = useState('')
  const [creando,    setCreando]    = useState(false)

  // Detail popover
  const [detalle, setDetalle] = useState(null) // tarea object

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
    const desde = new Date(year, month, 1).toISOString().slice(0,10)
    const hasta = new Date(year, month + 1, 0).toISOString().slice(0,10)
    const { data, error } = await supabase
      .from('tareas').select('*').eq('user_id', u.id)
      .gte('fecha', desde).lte('fecha', hasta)
      .order('hora', { ascending: true, nullsFirst: false })
    if (!error) setTareas(data ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { if (ready) cargar() }, [ready, cargar])

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  function tareasDelDia(dia) {
    const fecha = `${year}-${String(month+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return tareas.filter(t => t.fecha === fecha)
  }

  function abrirCrear(dia) {
    const fecha = `${year}-${String(month+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    setCrearDia(fecha); setCrearTitulo(''); setCrearMat(''); setCrearTipo('tarea'); setCrearHora('')
    setCrearOpen(true)
  }

  async function crearTarea() {
    if (!crearTitulo.trim()) { alert('Agrega un título'); return }
    setCreando(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tareas').insert({
      user_id: u.id, titulo: crearTitulo.trim(), materia: crearMat,
      tipo: crearTipo, hora: crearHora || null,
      completada: false, fecha: crearDia, duracion_min: 60,
    })
    if (!error) { setCrearOpen(false); cargar() }
    else console.error(error)
    setCreando(false)
  }

  async function toggleTarea(id, completada) {
    setTareas(prev => prev.map(t => t.id===id ? {...t,completada:!completada} : t))
    await supabase.from('tareas').update({ completada: !completada }).eq('id', id)
  }

  if (!ready) return null

  const days      = daysInMonth(year, month)
  const firstDay  = firstDayOfMonth(year, month)
  const todayStr  = today.toISOString().slice(0,10)
  const cells     = []

  // Empty cells for days before month start
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: `e${i}` })
  for (let d = 1; d <= days; d++) cells.push({ day: d, key: `d${d}` })

  const urgentTareas = tareas.filter(t => {
    const d = new Date(t.fecha + 'T12:00:00')
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const days = Math.round((d - hoy) / 86400000)
    return days >= 0 && days <= 3 && ['prueba','entrega','quiz'].includes(t.tipo)
  })

  return (
    <AppShell user={user}>
      <div className="cal-body">
        {/* Alert */}
        {urgentTareas.length > 0 && (
          <div className="alert-banner" style={{ marginBottom: 24 }}>
            <span className="alert-icon">⚡</span>
            <span>
              <strong>{urgentTareas.length} evaluación{urgentTareas.length!==1?'es':''}</strong> en los próximos 3 días:
              {urgentTareas.map(t => ` ${t.titulo} (${t.materia})`).join(',')}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="cal-header">
          <h1 className="cal-title">{MESES[month].charAt(0).toUpperCase()+MESES[month].slice(1)} {year}</h1>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth}><IconChevronLeft /></button>
            <button className="btn btn-ghost xs" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}>Hoy</button>
            <button className="cal-nav-btn" onClick={nextMonth}><IconChevronRight /></button>
          </div>
          <button className="btn btn-primary xs" onClick={() => abrirCrear(today.getDate())}>
            <IconPlus /> Evento
          </button>
        </div>

        {/* Calendar grid */}
        <div className="cal-grid">
          {DIAS_SEMANA.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          {cells.map(({ day, key }) => {
            if (!day) return <div key={key} className="cal-day cal-day-other" />
            const fecha   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday = fecha === todayStr
            const events  = tareasDelDia(day)
            return (
              <div key={key} className={`cal-day${isToday ? ' cal-day-today' : ''}`}
                onDoubleClick={() => abrirCrear(day)}>
                <div className="cal-day-num">{day}</div>
                {events.slice(0, 3).map(t => {
                  const c = TIPO_PILL[t.tipo] || 'c'
                  return (
                    <div key={t.id} className={`cal-event`}
                      style={{ background:`var(--c-${c}-bg)`, color:`var(--c-${c}-ink)`, textDecoration: t.completada ? 'line-through' : 'none' }}
                      onClick={e => { e.stopPropagation(); setDetalle(t) }}
                      title={t.titulo}>
                      {t.hora ? t.hora.slice(0,5) + ' ' : ''}{t.titulo}
                    </div>
                  )
                })}
                {events.length > 3 && (
                  <div style={{ fontSize:10, color:'var(--ink-4)', padding:'1px 4px' }}>+{events.length-3} más</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginTop:18, flexWrap:'wrap' }}>
          {Object.entries(TIPO_LABEL).map(([k,v]) => {
            const c = TIPO_PILL[k]
            return (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--ink-3)' }}>
                <span style={{ width:10, height:10, borderRadius:3, background:`var(--c-${c}-bg)`, border:`1px solid var(--c-${c}-ink)`, opacity:0.7, display:'inline-block' }} />
                {v}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create event modal */}
      {crearOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setCrearOpen(false) }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2 className="card-title">Nuevo evento</h2>
                <div className="card-sub">{crearDia}</div>
              </div>
              <button className="modal-close" onClick={() => setCrearOpen(false)}><IconX /></button>
            </div>
            <div className="card-fields">
              <div className="field">
                <label className="label">Título</label>
                <div className="input-wrap">
                  <input type="text" placeholder="¿Qué tienes?" autoFocus
                    value={crearTitulo} onChange={e => setCrearTitulo(e.target.value)} style={{paddingLeft:14}} />
                </div>
              </div>
              <div className="modal-row-2">
                <div className="field">
                  <label className="label">Materia</label>
                  <div className="input-wrap">
                    <input type="text" placeholder="Materia (opcional)"
                      value={crearMat} onChange={e => setCrearMat(e.target.value)} style={{paddingLeft:14}} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Tipo</label>
                  <div className="input-wrap">
                    <select value={crearTipo} onChange={e => setCrearTipo(e.target.value)}>
                      {TIPOS_FORM.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                    </select>
                    <span className="select-arrow"><IconChevron /></span>
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="label">Hora (opcional)</label>
                <div className="input-wrap">
                  <input type="time" value={crearHora} onChange={e => setCrearHora(e.target.value)} style={{paddingLeft:14}} />
                </div>
              </div>
              <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={crearTarea} disabled={creando}>
                <IconSave />{creando ? 'Guardando…' : 'Agregar evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event detail popover */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className={`pill pill-${TIPO_PILL[detalle.tipo]||'c'}`}>{TIPO_LABEL[detalle.tipo]}</span>
                <h2 className="card-title" style={{marginTop:8}}>{detalle.titulo}</h2>
                {detalle.materia && <div className="card-sub">{detalle.materia}</div>}
              </div>
              <button className="modal-close" onClick={() => setDetalle(null)}><IconX /></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:13.5, color:'var(--ink-3)' }}>
                📅 {detalle.fecha}{detalle.hora ? '  ·  ⏰ ' + detalle.hora.slice(0,5) : ''}
              </div>
              <button className="btn btn-ghost sm" onClick={() => { toggleTarea(detalle.id, detalle.completada); setDetalle(null) }}>
                {detalle.completada ? '↩ Marcar como pendiente' : '✓ Marcar como completada'}
              </button>
              <button className="btn btn-ghost sm" style={{color:'var(--ink-3)'}}
                onClick={() => router.push(`/materia/${encodeURIComponent(detalle.materia||'')}`)}>
                Ver en materia →
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
