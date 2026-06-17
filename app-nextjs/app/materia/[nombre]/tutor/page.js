'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function IconArrowLeft(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function IconSend()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg> }
function IconSparkle()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z"/></svg> }
function IconBook()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }
function IconTrash()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }

function materiaColor(nombre) {
  if (!nombre) return 'a'
  const palette = ['a','b','c','d','e']
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xFFFF
  return palette[hash % palette.length]
}

const PROMPTS_SUGERIDOS = (materia) => [
  `Explícame el concepto más importante de ${materia}`,
  `Tengo un examen de ${materia}. ¿Por dónde empezar a estudiar?`,
  `Dame un ejercicio de práctica de ${materia}`,
  `¿Cuáles son los errores más comunes en ${materia}?`,
]

export default function TutorPage() {
  const router  = useRouter()
  const params  = useParams()
  const nombre  = decodeURIComponent(params.nombre ?? '')
  const color   = materiaColor(nombre)

  const [user,     setUser]     = useState(null)
  const [ready,    setReady]    = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUser(data.session.user)
      setReady(true)
    })
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }

  async function enviar(texto) {
    const msg = (texto || input).trim()
    if (!msg || loading) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, materia: nombre }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error: ' + (err.error || 'No se pudo conectar al tutor.') }])
        setLoading(false)
        return
      }

      // Stream the response
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantMsg += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ No se pudo conectar al tutor. Verifica tu conexión.' }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  if (!ready) return null

  const initial     = user?.email ? user.email[0].toUpperCase() : 'U'
  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0] || 'tú'

  return (
    <div className="tutor-page">
      {/* Header */}
      <header className="tutor-header">
        <button className="tutor-back" onClick={() => router.push(`/materia/${encodeURIComponent(nombre)}`)}>
          <IconArrowLeft /> Volver a {nombre}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="tutor-title">Tutor IA</div>
            <div className="tutor-subject-pill">
              <span className={`dot dot-${color}`} />
              {nombre}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost xs" onClick={() => setMessages([])} title="Limpiar chat">
            <IconTrash /> Limpiar
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="tutor-messages">
        {messages.length === 0 ? (
          <div className="tutor-empty">
            <div className="tutor-empty-mark"><IconSparkle /></div>
            <div className="tutor-empty-title">Tutor de {nombre}</div>
            <div className="tutor-empty-sub">
              Pregúntame sobre cualquier concepto, pégame un ejercicio y te guío paso a paso, o pídeme que te prepare para tu próxima evaluación.
            </div>
            <div className="tutor-prompts">
              {PROMPTS_SUGERIDOS(nombre).map((p, i) => (
                <button key={i} className="tutor-prompt-btn" onClick={() => enviar(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`tutor-msg ${msg.role}`}>
              <div className="tutor-msg-avatar">
                {msg.role === 'user'
                  ? initial
                  : <IconBook />
                }
              </div>
              <div className="tutor-msg-bubble">
                {msg.content === '' && loading && i === messages.length - 1 ? (
                  <div className="tutor-typing">
                    <div className="tutor-dot"/><div className="tutor-dot"/><div className="tutor-dot"/>
                  </div>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="tutor-input-area">
        <div className="tutor-input-wrap">
          <textarea
            ref={textareaRef}
            className="tutor-textarea"
            rows={1}
            placeholder={`Pregúntame sobre ${nombre}… (Enter para enviar, Shift+Enter para nueva línea)`}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="tutor-send" onClick={() => enviar()} disabled={!input.trim() || loading}>
            <IconSend />
          </button>
        </div>
        <div style={{ marginTop:8, fontSize:11.5, color:'var(--ink-4)', textAlign:'center' }}>
          Potenciado por Gemini · Las respuestas son orientativas, no reemplazan a tu profesor
        </div>
      </div>
    </div>
  )
}
