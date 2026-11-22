import { Check, Circle } from 'lucide-react';
import { Icon } from './Icon';

const LEVEL_LABEL = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'] as const;

interface Check {
  id: string;
  label: string;
  met: boolean;
  required: boolean;
}

export function PasswordStrength({
  password,
  rulesId,
}: {
  password: string;
  rulesId: string;
}) {
  const checks: Check[] = [
    {
      id: 'min',
      label: 'Al menos 12 caracteres',
      met: password.length >= 12,
      required: true,
    },
    {
      id: 'max',
      label: 'Máximo 128 caracteres',
      met: password.length > 0 && password.length <= 128,
      required: true,
    },
    {
      id: 'case',
      label: 'Mayúsculas y minúsculas',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
      required: false,
    },
    {
      id: 'number',
      label: 'Un número',
      met: /\d/.test(password),
      required: false,
    },
    {
      id: 'symbol',
      label: 'Un símbolo',
      met: /[^A-Za-z0-9]/.test(password),
      required: false,
    },
  ];

  // "Máximo 128" no aporta seguridad: el propio input ya limita la longitud.
  const score = checks.filter((check) => check.id !== 'max' && check.met).length;

  return (
    <div className="password-strength">
      <div className="strength-head">
        <span className="meta-label">Seguridad de la contraseña</span>
        <span className="strength-level">{LEVEL_LABEL[score]}</span>
      </div>

      <progress
        className="strength-meter"
        max={4}
        value={score}
        aria-label="Seguridad de la contraseña"
      />

      <ul id={rulesId} className="rules-list">
        {checks.map((check) => (
          <li key={check.id} className="rule-item" data-met={check.met}>
            <Icon as={check.met ? Check : Circle} size={13} />
            <span className="visually-hidden">
              {check.met ? 'Cumplido: ' : 'Pendiente: '}
            </span>
            <span>{check.label}</span>
            <span className="rule-kind">
              {check.required ? 'obligatorio' : 'recomendado'}
            </span>
          </li>
        ))}
      </ul>

      <div className="visually-hidden" aria-live="polite">
        Seguridad: {LEVEL_LABEL[score]}
      </div>
    </div>
  );
}
