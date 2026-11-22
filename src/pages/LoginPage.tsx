import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { ErrorBox } from '../components/ui';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/reports';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-form-side" aria-labelledby="login-title">
        <div className="auth-form-inner">
          <p className="eyebrow">Acceso al laboratorio</p>
          <h1 id="login-title" tabIndex={-1}>
            Iniciar sesión
          </h1>
          <p className="page-description">
            Analiza correos sospechosos con reglas explicables y guía de mitigación.
          </p>

          <ErrorBox message={error} />

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Contraseña</label>
              <span id="login-password-hint" className="hint">
                Puedes pegar tu contraseña; el gestor de contraseñas también puede completarla.
              </span>
              <div className="password-row">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  aria-describedby="login-password-hint"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon as={showPassword ? EyeOff : Eye} /> {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Icon as={LogIn} /> {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="auth-switch">
            ¿Aún no tienes cuenta? <Link to="/register">Crear una cuenta</Link>
          </p>
        </div>
      </section>

      <aside className="auth-art" aria-hidden="true">
        <div className="sphere" />
        <p className="auth-art-caption">Correo bajo la lupa</p>
      </aside>
    </div>
  );
}
