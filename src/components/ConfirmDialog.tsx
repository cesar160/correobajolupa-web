import { useEffect, useId, useRef } from 'react';

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-outline" autoFocus onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
