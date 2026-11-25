import { Flag, Lock, Package } from 'lucide-react';
import { Icon } from './Icon';

const POINTS = [
  { icon: Lock, title: 'Nada se abre.', text: 'Los enlaces se muestran desactivados y nunca se visitan.' },
  { icon: Flag, title: 'Reglas explicables.', text: 'Cada señal trae su evidencia y qué hacer.' },
  { icon: Package, title: 'Cuarentena reversible', text: 'en el laboratorio, mensaje por mensaje.' },
];

/** Los tres principios del producto en el panel oscuro de acceso. */
export function AuthPoints() {
  return (
    <ul className="auth-points">
      {POINTS.map((point) => (
        <li key={point.title}>
          <span className="auth-point-icon"><Icon as={point.icon} size={16} /></span>
          <span>
            <strong>{point.title}</strong> {point.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
