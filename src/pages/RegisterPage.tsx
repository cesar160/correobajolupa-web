import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { InteractiveSphere } from '../components/InteractiveSphere';
import { PasswordStrength } from '../components/PasswordStrength';
import { ErrorBox } from '../components/ui';

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/reports" replace />;

  const passwordInvalid = passwordTouched && (password.length < 12 || password.length > 128);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({
        displayName,
        email,
        password,
        ...(inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {}),
      });
      navigate('/reports', { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-form-side" aria-labelledby="register-title">
        <div className="auth-form-inner">
          <p className="eyebrow">Crear cuenta</p>
          <h1 id="register-title" tabIndex={-1}>
            Crea tu cuenta
          </h1>
          <p className="page-description">
            Únete para analizar mensajes y dar seguimiento a tus reportes.
          </p>

          <ErrorBox message={error} />

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="register-name">Nombre visible</label>
              <input
                id="register-name"
                name="displayName"
                type="text"
                autoComplete="name"
                maxLength={80}
                enterKeyHint="next"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="register-email">Correo electrónico</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="register-password">Contraseña</label>
              <span id="register-password-hint" className="hint">
                Lo obligatorio viene del contrato de la API; lo demás son recomendaciones.
              </span>
              <PasswordStrength password={password} rulesId="register-password-rules" />
              <div className="password-row">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  aria-describedby={[
                    'register-password-hint',
                    'register-password-rules',
                    passwordInvalid ? 'register-password-error' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-invalid={passwordInvalid ? 'true' : 'false'}
                  enterKeyHint="next"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  onInvalid={() => setPasswordTouched(true)}
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
              {passwordInvalid && (
                <span id="register-password-error" className="error-msg">
                  Usa entre 12 y 128 caracteres.
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="register-invite">Código de invitación (si aplica)</label>
              <span id="register-invite-hint" className="hint">
                Déjalo vacío si el registro está abierto.
              </span>
              <input
                id="register-invite"
                name="inviteCode"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                aria-describedby="register-invite-hint"
                enterKeyHint="done"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Icon as={UserPlus} /> {busy ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="auth-switch">
            ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
          </p>
          <p className="hint auth-foot">Tu cuenta comienza con el rol de reportante.</p>
        </div>
      </section>

      <aside className="auth-art">
        <div className="auth-art-inner">
          <span className="auth-art-brand">CorreoBajoLupa</span>
          <div className="auth-art-copy">
            <h2>La seguridad empieza por observar.</h2>
            <p>Analiza mensajes sospechosos. Comprende las señales. Actúa con evidencia.</p>
            <span className="auth-art-badge">Análisis explicable</span>
            <p className="auth-art-foot">
              Diseñado para identificar y documentar indicios de phishing sin abrir enlaces peligrosos.
            </p>
          </div>
          <InteractiveSphere />
        </div>
      </aside>
    </div>
  );
}
