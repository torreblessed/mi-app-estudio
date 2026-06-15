// ── Root ─────────────────────────────────────────────────────────────────
const { useState, useEffect } = React;

function App() {
  const defaults = /*EDITMODE-BEGIN*/{
    "accent": "#3a5141",
    "background": "#f1ece3",
    "view": "dashboard"
  }/*EDITMODE-END*/;

  const [tweaks, setTweak] = useTweaks(defaults);
  const [authed, setAuthed] = useState(true);
  const [user, setUser] = useState({ name: "André Castro", email: "andre.castro@universidad.edu" });
  const [route, setRoute] = useState({ name: "dashboard", from: null });

  // Apply CSS variables from tweaks
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", tweaks.accent);
    r.style.setProperty("--bg", tweaks.background);
  }, [tweaks.accent, tweaks.background]);

  // Sync tweak `view` selector → route, only when they diverge (so user navigations win)
  useEffect(() => {
    if (tweaks.view === "login" && authed) setAuthed(false);
    else if (tweaks.view === "dashboard" && route.name !== "dashboard") { setAuthed(true); setRoute({ name: "dashboard" }); }
    else if (tweaks.view === "subject"   && route.name !== "subject")   { setAuthed(true); setRoute({ name: "subject", subjectId: "calc", from: "dashboard" }); }
    else if (tweaks.view === "tutor"     && route.name !== "tutor")     { setAuthed(true); setRoute({ name: "tutor", subjectId: null, from: "dashboard" }); }
  }, [tweaks.view]);

  const view = !authed ? "login" : route.name;
  const currentSubject = route.subjectId
    ? window.SUBJECTS.find(s => s.id === route.subjectId) || window.SUBJECTS[0]
    : null;

  const goDashboard = () => { setRoute({ name: "dashboard" }); setTweak("view", "dashboard"); };
  const goSubject = (id) => { setRoute({ name: "subject", subjectId: id, from: "dashboard" }); setTweak("view", "subject"); };
  const goTutor = (subjectId, from) => { setRoute({ name: "tutor", subjectId, from }); setTweak("view", "tutor"); };
  const back = () => {
    if (route.from === "subject" && route.subjectId) {
      setRoute({ name: "subject", subjectId: route.subjectId, from: "dashboard" });
      setTweak("view", "subject");
    } else {
      goDashboard();
    }
  };

  return (
    <React.Fragment>
      {view === "login" && (
        <LoginScreen
          accent={tweaks.accent}
          onSignIn={(u) => { setUser(u); setAuthed(true); setRoute({ name: "dashboard" }); setTweak("view", "dashboard"); }}
        />
      )}

      {view === "dashboard" && (
        <Dashboard
          user={user}
          subjects={window.SUBJECTS}
          tasks={window.TODAY_TASKS}
          events={window.WEEK_EVENTS}
          accent={tweaks.accent}
          onOpenSubject={goSubject}
          onLogout={() => { setAuthed(false); setTweak("view", "login"); }}
        />
      )}

      {view === "subject" && currentSubject && (
        <SubjectView
          subject={currentSubject}
          files={window.SUBJECT_FILES[currentSubject.id] || []}
          notes={window.SUBJECT_NOTES[currentSubject.id] || []}
          timeline={window.SUBJECT_TIMELINE[currentSubject.id] || []}
          user={user}
          accent={tweaks.accent}
          onBack={goDashboard}
          onLogout={() => { setAuthed(false); setTweak("view", "login"); }}
          onOpenTutor={() => goTutor(currentSubject.id, "subject")}
        />
      )}

      {view === "tutor" && (
        <TutorScreen
          contextSubject={currentSubject}
          user={user}
          accent={tweaks.accent}
          onBack={back}
        />
      )}

      {/* Floating FAB on dashboard + subject */}
      {authed && (view === "dashboard" || view === "subject") && (
        <button
          className="fab"
          style={{ background: tweaks.accent }}
          onClick={() => goTutor(view === "subject" ? currentSubject?.id : null, view)}
        >
          <Icon.Sparkle stroke="white"/>
          <span>Tutor IA</span>
        </button>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Navegación">
          <TweakRadio
            label="Vista"
            value={tweaks.view}
            onChange={(v) => setTweak("view", v)}
            options={[
              { value: "login",     label: "Login" },
              { value: "dashboard", label: "Panel" },
              { value: "subject",   label: "Materia" },
              { value: "tutor",     label: "Tutor" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Apariencia">
          <TweakColor
            label="Acento"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#3a5141", "#2c4a52", "#5a3c31", "#3d3b5c", "#1c2a3a"]}
          />
          <TweakColor
            label="Fondo"
            value={tweaks.background}
            onChange={(v) => setTweak("background", v)}
            options={["#f1ece3", "#f4efe7", "#ede7dc", "#f7f3ea", "#e8e2d4"]}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
