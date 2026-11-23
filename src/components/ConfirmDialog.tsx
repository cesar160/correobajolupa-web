import { useCallback, useEffect, useId, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Icon } from './Icon';

let displayTransitionSupport: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (displayTransitionSupport !== undefined) return displayTransitionSupport;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete')) return false;
  const probe = document.createElement('div');
  // El shorthand hace que los navegadores sin allow-discrete descarten la regla
  // completa, así que el sondeo devuelve false correctamente.
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  displayTransitionSupport = getComputedStyle(probe).display === 'block';
  probe.remove();
  return displayTransitionSupport;
}

function supportsTopLayerExit(): boolean {
  return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

/**
 * Confirmación de una acción destructiva con <dialog> nativo: el navegador
 * aporta inert, contención del foco, capa superior y cierre con Esc.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const closeAnimated = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;
    if (supportsTopLayerExit()) {
      dialog.close();
      return;
    }
    // Firefox y Safari pueden animar la entrada pero no la salida de la capa superior.
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise((resolve) => window.setTimeout(resolve, 2000)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
    dialog.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) void closeAnimated();
  }, [open, closeAnimated]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        void closeAnimated();
      }}
    >
      <div className="dialog-icon" aria-hidden="true">
        <Icon as={Trash2} size={20} />
      </div>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-outline" autoFocus onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>
          <Icon as={Trash2} /> {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
