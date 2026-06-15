// ── Tutor — full screen ──────────────────────────────────────────────────
const { useState: _useStateTut, useRef: _useRefTut, useEffect: _useEffectTut } = React;

function TutorScreen({ contextSubject, user, onBack, accent }) {
  const [input, setInput] = _useStateTut("");
  const [messages, setMessages] = _useStateTut([]);
  const scrollRef = _useRefTut(null);
  const inputRef = _useRefTut(null);

  _useEffectTut(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  _useEffectTut(() => { inputRef.current?.focus(); }, []);

  const ctxLabel = contextSubject
    ? contextSubject.name
    : "Asistente global";

  const firstName = (user?.name || "estudiante").split(" ")[0];

  const greeting = contextSubject
    ? `¿Qué quieres repasar de ${contextSubject.name}, ${firstName}?`
    : `Hola, ${firstName}. ¿Por dónde empezamos?`;

  const subgreeting = contextSubject
    ? `Conozco tu material, notas y próximas evaluaciones de esta materia.`
    : `Tengo contexto de tus 5 materias y de tus 5 evaluaciones próximas. Pregúntame lo que necesites.`;

  const prompts = contextSubject ? [
    { eyebrow: "Preparar evaluación", text: `Plan de estudio para ${contextSubject.nextEval.title.toLowerCase()}`, icon: <Icon.Calendar/> },
    { eyebrow: "Practicar",            text: `Hazme 5 preguntas tipo prueba`, icon: <Icon.Sparkle/> },
    { eyebrow: "Explicar",             text: `Explícame lo más difícil del temario`, icon: <Icon.Book/> },
    { eyebrow: "Resumir",              text: `Resume los últimos archivos subidos`, icon: <Icon.FileText/> },
  ] : [
    { eyebrow: "Planear",  text: `Plan de estudio para esta semana`, icon: <Icon.Calendar/> },
    { eyebrow: "Priorizar", text: `¿Qué debería estudiar hoy primero?`, icon: <Icon.Sparkle/> },
    { eyebrow: "Practicar", text: `Quiz rápido de Cálculo II`, icon: <Icon.Book/> },
    { eyebrow: "Resumir",   text: `Resume mis evaluaciones próximas`, icon: <Icon.FileText/> },
  ];

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;
    const u = { role: "user", text: t, time: nowTime() };
    setMessages(m => [...m, u]);
    setInput("");
    setTimeout(() => {
      const reply = contextSubject
        ? `Bien. Sobre ${contextSubject.name}: revisé tu material y tus notas. Te propongo un plan en 3 bloques de 25 min. ¿Lo armamos ahora?`
        : `Mirando tu agenda, tienes el quiz de Inglés hoy y la Prueba 2 de Cálculo en 3 días. Sugiero priorizar Cálculo. ¿Empezamos por integración por partes?`;
      setMessages(m => [...m, { role: "tutor", text: reply, time: nowTime() }]);
    }, 700);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onPromptClick = (p) => send(p.text);

  return (
    <div className="screen tutor" data-screen-label="04 Tutor IA">
      <header className="tutor-topbar">
        <div className="tutor-topbar-inner">
          <div className="tutor-tb-left">
            <button className="back-btn" style={{ marginBottom: 0 }} onClick={onBack}>
              <Icon.ArrowLeft/> Volver
            </button>
            <div className="tutor-tb-title">
              <div className="brand-mark sm" style={{ background: accent }}>
                <Icon.Sparkle stroke="white"/>
              </div>
              <span className="tutor-tb-name">Tutor IA</span>
              <span className="tutor-tb-context">
                <span className={`dot ${contextSubject ? `dot-${contextSubject.color}` : ""}`}></span>
                {ctxLabel}
              </span>
            </div>
          </div>
          <div className="tutor-tb-right">
            <button className="btn btn-ghost xs" onClick={() => setMessages([])}>Nueva conversación</button>
          </div>
        </div>
      </header>

      <div className="tutor-body">
        <div className="tutor-scroll" ref={scrollRef}>
          <div className="tutor-col">
            {messages.length === 0 ? (
              <div className="tutor-empty">
                <div className="tutor-empty-head">
                  <div className="tutor-empty-mark">
                    <Icon.Sparkle stroke="white"/>
                  </div>
                </div>
                <h1 className="tutor-empty-title">{greeting}</h1>
                <p className="tutor-empty-sub">{subgreeting}</p>

                <div className="prompt-grid">
                  {prompts.map((p, i) => (
                    <button key={i} className="prompt-card" onClick={() => onPromptClick(p)}>
                      <span className="prompt-icon">{p.icon}</span>
                      <span className="prompt-main">
                        <span className="prompt-eyebrow">{p.eyebrow}</span>
                        <span className="prompt-text">{p.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tutor-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`msg-block ${m.role}`}>
                    <div className="msg-author">
                      <div className={`msg-avatar ${m.role}`}>
                        {m.role === "tutor"
                          ? <Icon.Sparkle stroke="white"/>
                          : (user?.name || "T").trim()[0].toUpperCase()}
                      </div>
                      <span className="msg-name">{m.role === "tutor" ? "Tutor IA" : "Tú"}</span>
                      <span className="msg-time">{m.time}</span>
                    </div>
                    <div className="msg-content">{m.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="tutor-composer">
          <div className="composer-inner">
            <div className="composer-box">
              <textarea
                ref={inputRef}
                className="composer-input"
                placeholder={contextSubject ? `Pregúntale al tutor sobre ${contextSubject.name.toLowerCase()}…` : "Pregúntame sobre tus materias, evaluaciones o material…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
              />
              <div className="composer-row">
                <div className="composer-tools">
                  <button className="composer-tool"><Icon.Upload/> Adjuntar</button>
                  <button className="composer-tool"><Icon.Folder/> Material</button>
                </div>
                <button className="composer-send" onClick={() => send()} disabled={!input.trim()}>
                  <Icon.Send/>
                </button>
              </div>
            </div>
            <div className="composer-foot">
              El tutor consulta tu material; verifica respuestas críticas con fuentes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

window.TutorScreen = TutorScreen;
