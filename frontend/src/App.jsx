import { useState, useEffect } from 'react';
import Board from './components/Board';
import RequestForm from './components/RequestForm';
import Modal from './components/Modal';
import {
  listRequests,
  listStatuses,
  transitionRequest,
  createRequest,
  updateRequest,
  generateRequestSummary,
} from './api';
import { withTimeout } from './api/withTimeout';
import RequestDetail from './components/RequestDetail';
import './App.css';

function App() {
  const [statuses, setStatuses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [summaries, setSummaries] = useState({});
  const [toast, setToast] = useState(null);
  const [pendingIds, setPendingIds] = useState([]);
  const selected = requests.find((r) => r.id === selectedId);


  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([listStatuses(), listRequests()])
      .then(([s, r]) => {
        if (ignore) return;
        setStatuses(s);
        setRequests(r);
      })
      .catch((e) => {
        if (!ignore) setLoadError(e.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);


useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 4000);
  return () => clearTimeout(t);
}, [toast]);

async function handleTransition(id, to) {
  const previous = requests.find((r) => r.id === id);
  if (!previous || pendingIds.includes(id)) return;

  // Solo somos optimistas si el back ya nos dijo que esta transición es válida
  const isAllowed = previous.allowed_transitions.some((t) => t.code === to);
  const target = statuses.find((s) => s.code === to);

  setPendingIds((p) => [...p, id]);

  if (isAllowed && target) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: target, allowed_transitions: [] } : r))
    );
  }

  try {
    const updated = await transitionRequest(id, to);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setError(null);
  } catch (e) {
    // Rollback: la card vuelve exactamente a como estaba
    setRequests((prev) => prev.map((r) => (r.id === id ? previous : r)));
    setError(e.message);
  } finally {
    setPendingIds((p) => p.filter((x) => x !== id));
  }
}

async function handleCreate(data) {
  try {
    const created = await createRequest(data);
    setRequests((prev) => [...prev, created]);
    setError(null);
    setShowCreate(false);
    return true;
  } catch (e) {
    setError(e.message);
    return false;
  }
}

function openDetail(id) {
  setError(null);
  setSelectedId(id);
}

async function handleUpdate(id, changes) {
  try {
    const updated = await updateRequest(id, changes);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setError(null);
    return true;
  } catch (e) {
    setError(e.message);
    return false;
  }
}

const SUMMARY_TIMEOUT_MS = 15000;

async function handleGenerateSummary(id) {
  if (summaries[id]?.status === 'loading') return;
  const title = requests.find((r) => r.id === id)?.title ?? '';

  setSummaries((prev) => ({ ...prev, [id]: { status: 'loading', message: null } }));

  try {
    const updated = await withTimeout(
      generateRequestSummary(id),
      SUMMARY_TIMEOUT_MS,
      'El resumen tardó demasiado en responder. Intenta de nuevo.'
    );
    // Solo tomamos el resumen; el resto de la solicitud puede tener una transición optimista en curso
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ai_summary: updated.ai_summary } : r))
    );
    setSummaries((prev) => ({ ...prev, [id]: { status: 'success', message: null } }));
    setToast(`✨ Resumen listo: "${title}"`);
  } catch (e) {
    console.log('Falló el resumen:', id, e.message);
    setSummaries((prev) => ({ ...prev, [id]: { status: 'error', message: e.message } }));
    setToast(`⚠ No se pudo generar el resumen de "${title}"`);
  }
}

  return (
    <>
      <header className="navbar">
        <div className="brand">
          <span className="brand-bar" aria-hidden="true" />
          <div>
            <h1>Tablero</h1>
            <p>Gestión de solicitudes</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Nueva solicitud
        </button>
      </header>

      <main>
        {error && (
          <div role="alert" className="error">
            <span>{error}</span>
            <button type="button" className="error-close" onClick={() => setError(null)} aria-label="Cerrar">×</button>
          </div>
        )}

        {loading ? (
          <p className="board-status">Cargando tablero…</p>
        ) : loadError ? (
          <div className="board-status">
            <p>{loadError}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </button>
          </div>
        ) : (
          <Board
          statuses={statuses}
          requests={requests}
          pendingIds={pendingIds}
          summaries={summaries}
          onOpen={openDetail}
          onTransition={handleTransition}
        />
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva solicitud">
        <RequestForm onCreate={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>
      <Modal open={selected != null} onClose={() => setSelectedId(null)} title="Detalle de la solicitud">
        {selected && (
          <RequestDetail
            key={selected.id}
            request={selected}
            pending={pendingIds.includes(selected.id)}
            summary={summaries[selected.id]}
            error={error}
            onTransition={handleTransition}
            onUpdate={handleUpdate}
            onGenerateSummary={handleGenerateSummary}
          />
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </Modal>
    </>
  );
}

export default App;