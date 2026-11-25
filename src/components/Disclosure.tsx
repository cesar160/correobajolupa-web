import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Sección plegada con <details>: se abre con teclado (Enter o Espacio) y con la
 * búsqueda del navegador. Sirve para no saturar la vista con lo secundario.
 */
export function Disclosure({
  label,
  openLabel = 'Ver menos',
  children,
  className = '',
}: {
  label: string;
  openLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`disclosure ${className}`.trim()}>
      <summary>
        <span className="disclosure-closed">{label}</span>
        <span className="disclosure-open">{openLabel}</span>
        <Icon as={ChevronDown} size={16} />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
