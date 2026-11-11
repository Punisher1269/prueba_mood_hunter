import { useEffect, useRef } from 'react';

function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClick(e) {
    // Si el clic cayó en el fondo (el propio <dialog>) y no en el contenido, cerrar
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} onClick={handleClick}>
      <div className="modal-content">
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export default Modal;