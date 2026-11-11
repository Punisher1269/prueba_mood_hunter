import { useState } from 'react';

function RequestForm({ onCreate, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const ok = await onCreate({ title, description });
    setSaving(false);

    if (ok) {
      setTitle('');
      setDescription('');
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Título de la solicitud"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={150}
        required
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
        <div className="form-actions">
            <button type="button" onClick={onCancel}>Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Creando…' : 'Crear solicitud'}
            </button>
        </div>
    </form>
  );
}

export default RequestForm;