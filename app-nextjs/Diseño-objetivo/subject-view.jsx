// ── Subject view ─────────────────────────────────────────────────────────
const { useState: _useStateSub, useRef: _useRefSub, useEffect: _useEffectSub } = React;

function SubjectView({ subject, files, notes, timeline, user, onBack, onLogout, onOpenTutor, accent }) {
  const [tab, setTab] = _useStateSub("material");
  const [menuOpen, setMenuOpen] = _useStateSub(false);
  const menuRef = _useRefSub(null);
  _useEffectSub(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initial = (user?.name || "U").trim()[0].toUpperCase();
  const ne = subject.nextEval;
  const days = ne.daysAway;
  const urgent = days <= 3;
  const whenLabel = days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`;

  const handleTabClick = (id) => {
    if (id === "tutor") {
      onOpenTutor();
    } else {
      setTab(id);
    }
  };

  return (
    <div className="screen subject" data-screen-label={`03 ${subject.name}`}>
      <Topbar user={user} initial={initial} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} onLogout={onLogout} accent={accent} crumb={subject.name}/>

      <main className="subj-body">
        <button className="back-btn" onClick={onBack}>
          <Icon.ArrowLeft/> Volver al panel
        </button>

        {/* Hero */}
        <header className="subj-hero">
          <div className="subj-hero-left">
            <div className="subj-meta-row">
              <span className={`dot dot-${subject.color}`}></span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>{subject.code}</span>
              <span className="meta-sep">·</span>
              <span>{subject.professor}</span>
            </div>
            <h1 className="subj-h1">{subject.name}</h1>
          </div>

          <div className="subj-hero-right">
            <div className={`countdown ${urgent ? "urgent" : ""}`}>
              <div className="cd-eyebrow">Próxima evaluación</div>
              <div className="cd-top">
                <span className="cd-title">{ne.title}</span>
                <span className="cd-date">{formatDate(ne.date)}</span>
              </div>
              <div className="cd-foot">
                <span className="cd-days">{whenLabel}</span>
                <button className="btn btn-primary xs" onClick={onOpenTutor}>
                  <Icon.Sparkle/> Preparar con IA
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Metadata */}
        <div className="meta-strip">
          <div className="meta-strip-item progress">
            <div className="meta-strip-label">Avance del semestre</div>
            <div className="meta-strip-bar">
              <div className="bar lg"><div className="bar-fill" style={{ width: `${subject.progress}%` }}></div></div>
              <span className="meta-strip-val">{subject.progress}%</span>
            </div>
          </div>
          <div className="meta-strip-item">
            <div className="meta-strip-label">Material</div>
            <div className="meta-strip-num">{subject.materialsCount}</div>
          </div>
          <div className="meta-strip-item">
            <div className="meta-strip-label">Notas</div>
            <div className="meta-strip-num">{subject.notesCount}</div>
          </div>
          <div className="meta-strip-item">
            <div className="meta-strip-label">Rendidas</div>
            <div className="meta-strip-num">{timeline.filter(x => x.status === "done").length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <Tab id="material"  current={tab} setTab={handleTabClick} icon={<Icon.Folder/>}    label="Material" count={files.length}/>
          <Tab id="notas"     current={tab} setTab={handleTabClick} icon={<Icon.FileText/>}  label="Notas"    count={notes.length}/>
          <Tab id="timeline"  current={tab} setTab={handleTabClick} icon={<Icon.Timeline/>}  label="Línea de tiempo" count={timeline.length}/>
          <Tab id="tutor"     current={"_"}  setTab={handleTabClick} icon={<Icon.Chat/>}     label="Tutor IA"/>
        </div>

        <div className="tab-panel">
          {tab === "material" && <FilesTab files={files} subject={subject}/>}
          {tab === "notas"    && <NotesTab notes={notes} subject={subject}/>}
          {tab === "timeline" && <TimelineTab timeline={timeline} subject={subject}/>}
        </div>
      </main>
    </div>
  );
}

function Tab({ id, current, setTab, icon, label, count, badge }) {
  return (
    <button className={`tab ${current === id ? "tab-active" : ""}`} onClick={() => setTab(id)}>
      {icon}<span>{label}</span>
      {count !== undefined && <span className="tab-count">{count}</span>}
      {badge && <span className="tab-badge">{badge}</span>}
    </button>
  );
}

function FilesTab({ files, subject }) {
  if (!files || files.length === 0) {
    return <EmptyState title="Sin archivos aún" sub="Sube apuntes, slides o fotos de la pizarra."/>;
  }
  return (
    <div className="files">
      <div className="files-head">
        <div className="files-label">{files.length} archivos</div>
        <button className="btn btn-ghost xs"><Icon.Upload/> Subir archivo</button>
      </div>
      <ul className="file-list">
        {files.map(f => (
          <li key={f.id} className="file-row">
            <div className="file-kind">{(KIND_META[f.kind] || KIND_META.pdf).label}</div>
            <div className="file-main">
              <div className="file-name">{f.name}</div>
              <div className="file-meta">
                <span>{f.source}</span>
                <span className="meta-sep">·</span>
                <span>{formatDate(f.date)}</span>
                <span className="meta-sep">·</span>
                <span>{f.size}</span>
              </div>
            </div>
            <button className="file-action"><Icon.Sparkle/> Resumir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotesTab({ notes, subject }) {
  if (!notes || notes.length === 0) {
    return <EmptyState title="Sin notas aún" sub="Anota fórmulas, dudas o resúmenes que necesites recordar."/>;
  }
  return (
    <div className="notes-tab">
      <div className="notes-head">
        <div className="files-label">{notes.length} notas</div>
        <button className="btn btn-ghost xs"><Icon.Plus/> Nueva nota</button>
      </div>
      <div className="notes-grid">
        {notes.map(n => (
          <article key={n.id} className="note-card">
            <h3 className="note-title">{n.title}</h3>
            <p className="note-body">{n.body}</p>
            <div className="note-foot">
              <span className="note-date">{formatDate(n.date)}</span>
              <span className="note-action">Abrir →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TimelineTab({ timeline, subject }) {
  const sorted = [...timeline].sort((a,b) => a.date.localeCompare(b.date));
  return (
    <div className="timeline">
      {sorted.map((x, i) => (
        <div key={x.id} className={`tl-item tl-${x.status}`}>
          <div className="tl-axis">
            <div className={`tl-node ${x.status === "done" ? "node-done" : ""}`}>
              {x.status === "done" && <Icon.Check/>}
            </div>
            {i < sorted.length - 1 && <div className="tl-line"></div>}
          </div>
          <div className="tl-card">
            <div className="tl-top">
              <span className={`pill pill-${subject.color}`}>{x.type}</span>
              <span className="tl-date">{formatDate(x.date)}</span>
              {x.status === "upcoming" && <span className="tl-days">{daysAwayLabel(x.days)}</span>}
            </div>
            <div className="tl-title">{x.title}</div>
            {x.status === "done" && (
              <div className="tl-foot">
                <span className="grade">Nota<strong>{x.grade.toFixed(1)}</strong></span>
                <span className="meta">Rendida</span>
              </div>
            )}
            {x.status === "upcoming" && (
              <div className="tl-foot">
                <button className="link-mini">Plan de estudio →</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, sub }) {
  return (
    <div className="empty">
      <div className="empty-art">
        <div className="empty-doc"></div>
        <div className="empty-doc"></div>
        <div className="empty-doc front"></div>
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}

Object.assign(window, { SubjectView });
