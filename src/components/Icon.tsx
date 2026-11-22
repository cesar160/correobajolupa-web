import type { LucideIcon } from 'lucide-react';

/**
 * Todos los iconos son decorativos: el control o el texto que los acompaña
 * aporta el nombre accesible. Esto evita que un lector de pantalla anuncie
 * dos veces la misma acción.
 */
export function Icon({ as: Glyph, size = 16 }: { as: LucideIcon; size?: number }) {
  return <Glyph size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
}
