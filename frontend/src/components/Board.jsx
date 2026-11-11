import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import Column from './Column';

function Board({ statuses, requests, pendingIds, summaries, onOpen, onTransition }) {
  const [activeId, setActiveId] = useState(null);
  const active = requests.find((r) => r.id === activeId);
  const allowedCodes = active ? active.allowed_transitions.map((t) => t.code) : [];

  // El arrastre solo empieza si el mouse se mueve más de 5px. Así el clic sigue abriendo el modal.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return; // se soltó fuera de cualquier columna

    const request = requests.find((r) => r.id === active.id);
    if (!request || request.status.code === over.id) return; // misma columna, nada que hacer

    onTransition(request.id, over.id);
  }

  function getDropState(code) {
    if (!active) return 'idle';
    if (code === active.status.code) return 'origin';
    return allowedCodes.includes(code) ? 'allowed' : 'blocked';
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="board">
        {statuses.map((s) => (
        <Column
            key={s.code}
            status={s}
            requests={requests.filter((r) => r.status.code === s.code)}
            pendingIds={pendingIds}
            summaries={summaries}
            onOpen={onOpen}
            dropState={getDropState(s.code)}
        />
        ))}
      </div>

      <DragOverlay>
        {active ? (
          <article className="card card--overlay">
            <h3>{active.title}</h3>
            {active.description && <p>{active.description}</p>}
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default Board;