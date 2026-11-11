import { useEffect, useState } from 'react';
import { getHistory } from '../api';

function describe(e) {
  switch (e.type) {
    case 'created':             return 'Solicitud creada';
    case 'status_changed':      return `${e.from.label} → ${e.to.label}`;
    case 'title_changed':       return `Título: "${e.from}" → "${e.to}"`;
    case 'description_changed': return 'Descripción actualizada';
    default:                    return e.type;
  }
}

function HistoryList({ request }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    setError(null);
    getHistory(request.id)
      .then((data) => { if (!ignore) setEvents(data); })
      .catch((e) => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [request.id, request.updated_at]);

  return (
    <details className="history">
      <summary>Historial {events ? `(${events.length})` : ''}</summary>
      {error && <p className="ai-error">{error}</p>}
      {!events && !error && <p className="ai-hint">Cargando…</p>}
      {events && (
        <ol className="history-list">
          {[...events].reverse().map((e, i) => (
            <li key={i}>
              <span>{describe(e)}</span>
              <time dateTime={e.at}>
                {new Date(e.at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

export default HistoryList;