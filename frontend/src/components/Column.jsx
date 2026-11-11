import { useDroppable } from '@dnd-kit/core';
import RequestCard from './RequestCard';

function Column({ status, requests, pendingIds, summaries, onOpen, dropState }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.code });

  const classes = ['column', `column--${dropState}`, isOver ? 'column--over' : '']
    .join(' ');

  return (
    <section ref={setNodeRef} className={classes}>
      <header className="column-header">
        <h2>
            <span className={`dot dot-${status.code}`} aria-hidden="true" />
            {status.label}
        </h2>
        <span className="count">{requests.length}</span>
      </header>

      <div className="column-body">
        {requests.length === 0 ? (
          <p className="empty">Sin solicitudes</p>
        ) : (
          requests.map((r) => (
            <RequestCard
            key={r.id}
            request={r}
            pending={pendingIds.includes(r.id)}
            summaryStatus={summaries[r.id]?.status}
            onOpen={onOpen}
            />
            ))
        )}
      </div>
    </section>
  );
}

export default Column;