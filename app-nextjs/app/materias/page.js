'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

function IconPlus()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IconX()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }
function IconSave()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }

const COLORS = [
  { key:'a', label:'Ámbar' },
  { key:'b', label:'Verde' },
  { key:'c', label:'Azul' },
  { key:'d', label:'Rosa' },
  { key:'e', label:'Violeta' },
]

function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

function daysLabel(n) {
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}

export default function MateriasPage() {
  const router = useRouter()
  const [user,    setUser]    = useState(null)
  const [ready,   setReady]   = useState(false)

  // Materias from notas+tareas (dynamic) + saved in materias table
  const [allNotas,      setAllNotas]      = useState([])
  const [upcomingEvals, setUpcomingEvals] = useState([])
  const [materiasTable, setMateriasTable] = useState([]) // from materias table

  const [loading, setLoading] = useState(true)

  // Create materia modal
  const [crearOpen,   setCrearOpen]   = useState(false)
  const [crearNombre, setCrearNombre] = useState('')
  const [crearCodigo, setCrearCodigo] = useState('')
  const [crearProf,   setCrearProf]   = useState('')
  const [crearColor,  setCrearColor]  = useState('a')
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState('')

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

    const [notasRes, evalsRes, matsRes] = await Promise.all([
      supabase.from('notas').select('materia').eq('user_id', u.id),
      supabase.from('tareas').select('*').eq('user_id', u.id)
        .in('tipo', ['prueba','entrega','quiz'])
        .gte('fecha', new Date().toISOString().slice(0,10))
        .order('fecha', { ascending: true }),
      supabase.from('materias').select('*').eq('user_id', u.id).neq('activa', false).order('nombre'),
    ])

    if (!notasRes.error) setAllNotas(notasRes.data ?? [])
    if (!evalsRes.error) setUpcomingEvals(evalsRes.data ?? [])
    if (!matsRes.error)  setMateriasTable(matsRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (ready) cargar() }, [ready, cargar])

  // Merge materias from all sources (notas + tareas + materias table)
  const materias = useMemo(() => {
    const map = {}

    // From materias table (manual/Canvas)
    materiasTable.forEach(m => {
      map[m.nombre] = { nombre: m.nombre, codigo: m.codigo, profesor: m.profesor, color: m.color || materiaColor(m.nombre), notasCount: 0, nextEval: null, fromTable: true }
    })

    // From notas
    allNotas.forEach(n => {
      if (!n.materia) return
      if (!map[n.materia]) map[n.materia] = { nombre: n.materia, color: materiaColor(n.materia), notasCount: 0, nextEval: null }
      map[n.materia].notasCount++
    })

    // From evals
    upcomingEvals.forEach(e => {
      if (!e.materia) return
      if (!map[e.materia]) map[e.materia] = { nombre: e.materia, color: materiaColor(e.materia), notasCount: 0, nextEval: null }
      if (!map[e.materia].nextEval) {
        const d = new Date(e.fecha + 'T12:00:00')
        const hoy = new Date(); hoy.setHours(0,0,0,0)
        const daysAway = Math.round((d - hoy) / 86400000)
        map[e.materia].nextEval = { tipo: e.tipo, titulo: e.titulo, daysAway }
      }
    })

    return Object.values(map).sort((a,b) => a.nombre.localeCompare(b.nombre))
  }, [allNotas, upcomingEvals, materiasTable])

  async function crearMateria() {
    if (!crearNombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true); setError('')
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('materias').insert({
      user_id: u.id, nombre: crearNombre.trim(),
      codigo: crearCodigo.trim() || null,
      profesor: crearProf.trim() || null,
      color: crearColor,
    })
    if (!err) {
      setCrearNombre(''); setCrearCodigo(''); setCrearProf(''); setCrearColor('a')
      setCrearOpen(false); cargar()
    } else {
      console.error(err)
      setError(err.message)
    }
    setGuardando(false)
  }

  const TIPO_LABEL = { tarea:'Tarea', prueba:'Prueba', entrega:'Entrega', lectura:'Lectura', quiz:'Quiz' }

  if (!ready) return null

  return (
    <AppShell user={user}>
      <div className="materias-body">
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:32, gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:32, fontWeight:400, letterSpacing:'-0.025em', marginBottom:4 }}>Materias</h1>
            <p style={{ fontSize:14, color:'var(--ink-3)', margin:0 }}>{materias.length} asignatura{materias.length!==1?'s':''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCrearOpen(true)}>
            <IconPlus /> Nueva materia
          </button>
        </div>

        {loading ? (
          <div className="skeleton-grid">{[1,2,3,4].map(i=><div key={i} className="skeleton-card"/>)}</div>
        ) : materias.length === 0 ? (
          <div className="empty">
            <div className="empty-art"><div className="empty-doc"/><div className="empty-doc"/><div className="empty-doc front"/></div>
            <div className="empty-title">Sin materias todavía</div>
            <div className="empty-sub">Crea tu primera materia con el botón de arriba, o agrega notas y tareas para que aparezcan aquí.</div>
          </div>
        ) : (
          <div className="subjects-grid">
            {materias.map(m => {
              const color  = m.color || materiaColor(m.nombre)
              const ne     = m.nextEval
              const urgent = ne && ne.daysAway <= 3
              return (
                <button key={m.nombre} className="subj-card"
                  onClick={() => router.push(`/materia/${encodeURIComponent(m.nombre)}`)}>
                  <div className="subj-card-head">
                    <div className="subj-codeline">
                      <span className={`dot dot-${color}`} />
                      <span>{m.codigo || m.nombre}</span>
                    </div>
                    <span className="foot-stat" style={{ fontSize:11 }}>{m.notasCount} nota{m.notasCount!==1?'s':''}</span>
                  </div>
                  <div className="subj-name">{m.nombre}</div>
                  {m.profesor && <div className="subj-prof">{m.profesor}</div>}
                  {ne ? (
                    <div className="subj-next">
                      <div className="next-eyebrow">Próxima · {TIPO_LABEL[ne.tipo]||ne.tipo}</div>
                      <div className="next-row">
                        <span className="next-title">{ne.titulo}</span>
                        <span className={`next-when${urgent?' urgent':''}`}>{daysLabel(ne.daysAway)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="subj-next">
                      <div className="next-eyebrow" style={{color:'var(--ink-5)'}}>Sin evaluaciones próximas</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {crearOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setCrearOpen(false) }}>
          <div className="modal">
            <div className="modal-head">
              <div><h2 className="card-title">Nueva materia</h2><div className="card-sub">Agrégala a tu lista de asignaturas</div></div>
              <button className="modal-close" onClick={() => setCrearOpen(false)}><IconX /></button>
            </div>
            <div className="card-fields">
              <div className="field">
                <label className="label">Nombre *</label>
                <div className="input-wrap" style={error ? {borderColor:'var(--danger)'} : {}}>
                  <input type="text" placeholder="Ej: Cálculo diferencial" autoFocus
                    value={crearNombre} onChange={e => { setCrearNombre(e.target.value); if(error) setError('') }}
                    style={{paddingLeft:14}} />
                </div>
                {error && <div className="field-error">{error}</div>}
              </div>
              <div className="modal-row-2">
                <div className="field">
                  <label className="label">Código</label>
                  <div className="input-wrap">
                    <input type="text" placeholder="MAT-101"
                      value={crearCodigo} onChange={e => setCrearCodigo(e.target.value)} style={{paddingLeft:14}} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Color</label>
                  <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                    {COLORS.map(c => (
                      <button key={c.key} title={c.label}
                        onClick={() => setCrearColor(c.key)}
                        style={{ width:28, height:28, borderRadius:'50%', border: crearColor===c.key ? '3px solid var(--ink)' : '2px solid transparent', background:`var(--c-${c.key})`, cursor:'pointer', transition:'border 0.15s ease' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="label">Profesor</label>
                <div className="input-wrap">
                  <input type="text" placeholder="Nombre del profesor"
                    value={crearProf} onChange={e => setCrearProf(e.target.value)} style={{paddingLeft:14}} />
                </div>
              </div>
              <button className="btn btn-primary" style={{width:'100%',padding:'13px 18px'}} onClick={crearMateria} disabled={guardando}>
                <IconSave />{guardando ? 'Guardando…' : 'Crear materia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
