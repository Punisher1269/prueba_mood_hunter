import { useState } from 'react';
import AiSummary from './AiSummary';
import HistoryList from './HistoryList';

function RequestDetail({ request, pending, summary, error, onTransition, onUpdate, onGenerateSummary }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setTitle(request.title);
    setDescription(request.description);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();

    // PATCH: enviar solo lo que cambió
    const changes = {};
    if (title.trim() !== request.title) changes.title = title;
    if (description.trim() !== request.description) changes.description = description;

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const ok = await onUpdate(request.id, changes);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="detail">
      {error && <p role="alert" className="error">{error}</p>}

      <span className={`badge badge-${request.status.code}`}>{request.status.label}</span>

      {editing ? (
        <form className="request-form" onSubmit={handleSave}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="form-actions">
            <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="detail-view">
          <h3>{request.title}</h3>
          <p>{request.description || <em>Sin descripción</em>}</p>
          <button type="button" onClick={startEdit}>Editar</button>
        </div>
      )}

      <section className="detail-transitions">
        <h4>Mover a</h4>
        {pending ? (
            <small>Actualizando estado…</small>
        ) : request.allowed_transitions.length === 0 ? (
            <small>Estado final, no se puede mover.</small>
        ) : (
            <div className="transition-buttons">
            {request.allowed_transitions.map((t) => (
                <button key={t.code} type="button" onClick={() => onTransition(request.id, t.code)}>
                {t.label}
                </button>
            ))}
            </div>
        )}
        </section>
        <AiSummary request={request} summary={summary} onGenerate={onGenerateSummary} />
        <HistoryList request={request} />
    </div>
  );
}

export default RequestDetail;