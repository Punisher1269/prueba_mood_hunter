import { useDraggable } from '@dnd-kit/core';

function RequestCard({ request, pending,summaryStatus, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.id,
    disabled: pending,
  });

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(request.id);
    }
  }

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`card ${isDragging ? 'card--dragging' : ''} ${pending ? 'card--pending' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={handleKeyDown}
    >
      <h3>{request.title}</h3>
      {request.description && <p>{request.description}</p>}
      {pending && <small className="card-pending">Guardando…</small>}
      {summaryStatus === 'loading' && <small className="card-ai">✨ Generando resumen…</small>}
      {summaryStatus === 'success' && <small className="card-ai">✨ Resumen listo</small>}
      {summaryStatus === 'error' && <small className="card-ai card-ai--error">⚠ Resumen falló</small>}
    </article>
  );
}

export default RequestCard;