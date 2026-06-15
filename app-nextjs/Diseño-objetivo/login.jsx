// ── Login screen ─────────────────────────────────────────────────────────
const { useState: _useStateLogin } = React;

function LoginScreen({ onSignIn, accent }) {
  const [email, setEmail] = _useStateLogin("andre.castro@universidad.edu");
  const [pass, setPass] = _useStateLogin("•••••••");
  const [showPass, setShowPass] = _useStateLogin(false);
  const [mode, setMode] = _useStateLogin("signin");
  const [name, setName] = _useStateLogin("");
  const [loading, setLoading] = _useStateLogin(false);

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !pass) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignIn({ email, name: name || "André Castro" });
    }, 500);
  };

  return (
    <div className="screen login" data-screen-label="01 Login">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark" style={{ background: accent }}>
            <Icon.Book stroke="white"/>
          </div>
          <div className="brand-name">Aula</div>
        </div>

        <h1 className="login-title">
          {mode === "signin" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
        </h1>
        <p className="login-sub">
          {mode === "signin"
            ? "Tu centro de estudio te espera."
            : "Empieza a organizar tu semestre con IA."}
        </p>

        <form className="login-form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="field">
              <span className="label">Nombre</span>
              <div className="input-wrap">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" autoComplete="name"/>
              </div>
            </label>
          )}
          <label className="field">
            <span className="label">Correo universitario</span>
            <div className="input-wrap">
              <span className="input-icon"><Icon.Mail/></span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu.nombre@universidad.edu" autoComplete="email"/>
            </div>
          </label>
          <label className="field">
            <span className="label-row">
              <span className="label">Contraseña</span>
              {mode === "signin" && <a className="link-mini" href="#" onClick={e => e.preventDefault()}>¿Olvidaste tu contraseña?</a>}
            </span>
            <div className="input-wrap">
              <span className="input-icon"><Icon.Lock/></span>
              <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"/>
              <button type="button" className="input-trail" onClick={() => setShowPass(s => !s)} aria-label="Mostrar">
                {showPass ? <Icon.EyeOff/> : <Icon.Eye/>}
              </button>
            </div>
          </label>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando…" : (mode === "signin" ? "Iniciar sesión" : "Crear cuenta")}
          </button>
          <div className="divider"><span>o</span></div>
          <button type="button" className="btn btn-ghost" onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Crear cuenta nueva" : "Ya tengo una cuenta"}
          </button>
        </form>

        <p className="legal">
          Al continuar aceptas los <a href="#" onClick={e => e.preventDefault()}>Términos</a> y la <a href="#" onClick={e => e.preventDefault()}>Política de privacidad</a>.
        </p>
      </div>

      <div className="login-foot">
        <div className="foot-dot"></div>
        <span>Centro de estudio con IA · v0.4</span>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
