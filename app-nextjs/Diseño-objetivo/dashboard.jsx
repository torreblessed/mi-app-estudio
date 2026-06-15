// ── Dashboard ────────────────────────────────────────────────────────────
const { useState: _useStateDash, useMemo: _useMemoDash, useRef: _useRefDash, useEffect: _useEffectDash } = React;

function Dashboard({ user, subjects, tasks, events, onOpenSubject, onLogout, accent }) {
  const [doneTasks, setDoneTasks] = _useStateDash(() => new Set(tasks.filter(t => t.done).map(t => t.id)));
  const [menuOpen, setMenuOpen] = _useStateDash(false);
  const menuRef = _useRefDash(null);

  _useEffectDash(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleTask = (id) => {
    setDoneTasks(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const remaining = tasks.filter(t => !doneTasks.has(t.id)).length;
  const completed = tasks.filter(t => doneTasks.has(t.id)).length;
  const totalMinutes = tasks.filter(t => !doneTasks.has(t.id)).reduce((s, t) => s + t.duration, 0);
  const firstName = (user?.name || "estudiante").split(" ")[0];
  const thisWeekTests = events.filter(e => e.type === "Prueba" || e.type === "Control" || e.type === "Quiz").length;

  const initial = (user?.name || "U").trim()[0].toUpperCase();

  return (
    <div className="screen dashboard" data-screen-label="02 Dashboard">
      <Topbar user={user} initial={initial} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} onLogout={onLogout} accent={accent}/>

      <main className="dash-body">
        {/* Hero */}
        <header className="hero">
          <div>
            <div className="hero-date">{formatDateLong(new Date().toISOString().slice(0,10))}</div>
            <h1 className="hero-title">
              Hola, {firstName}.{" "}
              <span className="hero-accent">
                Esta semana tienes <strong>{thisWeekTests} evaluaciones</strong> y {remaining} {remaining === 1 ? "tarea" : "tareas"} pendientes para hoy.
              </span>
            </h1>
          </div>
        </header>

        <div className="dash-grid">
          {/* Left column */}
          <div className="dash-left">
            {/* Today */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Hoy</h2>
                <span className="link-mini">{remaining} pendientes · {Math.round(totalMinutes/60*10)/10}h estimadas</span>
              </div>

              <ul className="task-list">
                {tasks.map(t => {
                  const s = subjectById(t.subject, subjects);
                  const done = doneTasks.has(t.id);
                  return (
                    <li key={t.id} className={`task ${done ? "task-done" : ""}`}>
                      <button className={`tcheck ${done ? "checked" : ""}`} onClick={() => toggleTask(t.id)} aria-label="Marcar">
                        {done && <Icon.Check/>}
                      </button>
                      <div className="task-main">
                        <div className="task-title">{t.title}</div>
                        <div className="task-meta">
                          <span className={`dot dot-${s.color}`}></span>
                          <span>{s.name}</span>
                          <span className="meta-sep">·</span>
                          <span>{t.duration} min</span>
                        </div>
                      </div>
                      <span className="task-time">{t.time}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Subjects */}
            <section>
              <div className="section-head">
                <h2 className="section-title">Materias</h2>
                <button className="link-mini">Ver todas →</button>
              </div>
              <div className="subjects-grid">
                {subjects.map(s => (
                  <SubjectCard key={s.id} subject={s} onOpen={() => onOpenSubject(s.id)}/>
                ))}
              </div>
            </section>
          </div>

          {/* Right column — calendar only */}
          <aside className="dash-right">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Esta semana</h2>
                  <div className="card-sub">{events.length} eventos · 25–31 mayo</div>
                </div>
                <button className="icon-btn sm" title="Calendario completo"><Icon.Calendar/></button>
              </div>
              <ul className="week-list">
                {events.map((ev, i) => {
                  const s = subjectById(ev.subject, subjects);
                  const isToday = i === 0;
                  return (
                    <li key={ev.id} className={`wk ${isToday ? "wk-today" : ""}`}>
                      <div className="wk-date">
                        <div className="wk-wd">{ev.weekday}</div>
                        <div className="wk-d">{String(ev.day).padStart(2,"0")}</div>
                      </div>
                      <div className="wk-body">
                        <div className="wk-row">
                          <span className={`pill pill-${s.color}`}>{ev.type}</span>
                          {ev.time && <span className="wk-time">{ev.time}</span>}
                        </div>
                        <div className="wk-title">{ev.title}</div>
                        <div className="wk-sub">
                          <span className={`dot dot-${s.color}`}></span>
                          {s.name}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SubjectCard({ subject, onOpen }) {
  const s = subject;
  const days = s.nextEval.daysAway;
  const urgent = days <= 3;
  const whenLabel = days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`;
  return (
    <button className="subj-card" onClick={onOpen}>
      <div className="subj-card-head">
        <div className="subj-codeline">
          <span className={`dot dot-${s.color}`}></span>
          <span>{s.code}</span>
        </div>
        <span className="foot-stat" style={{ fontSize: 11 }}>{s.materialsCount + s.notesCount} items</span>
      </div>

      <div>
        <div className="subj-name">{s.name}</div>
        <div className="subj-prof">{s.professor}</div>
      </div>

      <div className="subj-next">
        <div className="next-eyebrow">Próxima · {s.nextEval.type}</div>
        <div className="next-row">
          <span className="next-title">{s.nextEval.title}</span>
          <span className={`next-when ${urgent ? "urgent" : ""}`}>{whenLabel}</span>
        </div>
      </div>

      <div className="subj-progress">
        <div className="progress-row">
          <span className="progress-label">Avance</span>
          <span className="progress-val">{s.progress}%</span>
        </div>
        <div className="bar"><div className="bar-fill" style={{ width: `${s.progress}%` }}></div></div>
      </div>
    </button>
  );
}

function Topbar({ user, initial, menuOpen, setMenuOpen, menuRef, onLogout, accent, crumb }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-row">
          <div className="brand-mark sm" style={{ background: accent }}>
            <Icon.Book stroke="white"/>
          </div>
          <div className="brand-name sm">Aula</div>
          {crumb && (<><span className="crumb-sep">/</span><span className="crumb">{crumb}</span></>)}
        </div>
        <div className="topbar-actions">
          <div className="search-mini">
            <Icon.Search/>
            <input placeholder="Buscar en materias, notas, archivos…"/>
            <span className="kbd">⌘K</span>
          </div>
          <button className="icon-btn" title="Notificaciones">
            <Icon.Bell/>
            <span className="dot-badge"></span>
          </button>
          <div className="user-menu" ref={menuRef}>
            <button className="avatar-btn" onClick={() => setMenuOpen(o => !o)}>
              <span className="avatar" style={{ background: accent }}>{initial}</span>
              <span className="user-name">{user?.name || "Estudiante"}</span>
              <Icon.Chevron/>
            </button>
            {menuOpen && (
              <div className="menu-pop">
                <div className="menu-head">
                  <div className="menu-name">{user?.name || "Estudiante"}</div>
                  <div className="menu-mail">{user?.email}</div>
                </div>
                <button className="menu-item">Mi perfil</button>
                <button className="menu-item">Preferencias</button>
                <div className="menu-sep"></div>
                <button className="menu-item danger" onClick={onLogout}>
                  <Icon.Logout/> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Dashboard, Topbar, SubjectCard });
