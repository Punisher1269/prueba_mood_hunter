// Red general: failRate 0.3 = falla 3 de cada 10 llamadas
const NETWORK = { minDelay: 300, maxDelay: 900, failRate: 0 };

// LLM: configuración aparte, para que solo el resumen falle o tarde
const LLM = { minDelay: 2000, maxDelay: 5000, failRate: 0 };

if (import.meta.env.DEV) {
  window.__mock = NETWORK;    // en consola: __mock.failRate = 1
  window.__mockLLM = LLM;     // en consola: __mockLLM.failRate = 1
}

async function simulateNetwork() {
  const ms = NETWORK.minDelay + Math.random() * (NETWORK.maxDelay - NETWORK.minDelay);
  await new Promise((resolve) => setTimeout(resolve, ms));

  if (Math.random() < NETWORK.failRate) {
    throw new Error('No se pudo conectar con el servidor. Intenta de nuevo.');
  }
}

const STATUSES = {
  created:     'Creada',
  in_review:   'En revisión',
  in_progress: 'En progreso',
  paused:      'Pausada',
  done:        'Terminada',
};

const TRANSITIONS = {
  created:     ['in_review'],
  in_review:   ['in_progress', 'paused'],
  in_progress: ['done', 'paused'],
  paused:      ['in_progress', 'in_review'],
  done:        [],
};

let nextId = 3;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

const db = [
  { id: 1, title: 'Acceso a VPN', description: 'Nuevo ingreso del área de soporte',
    status: 'created', created_at: daysAgo(2), updated_at: daysAgo(2), ai_summary: null},
  { id: 2, title: 'Licencia de Office', description: 'Equipo de ventas',
    status: 'in_progress', created_at: daysAgo(8), updated_at: daysAgo(5),ai_summary: null},
  { id: 3, title: 'Prueba Tecnica', description: 'Prueba tecnica para puesto como Dev en MOOD HUNTER',
    status: 'in_review', created_at: daysAgo(8), updated_at: daysAgo(5),ai_summary: null},
];

// Simula la tabla request_events. La escribe SOLO el mock (el back), nunca el front.
let nextEventId = 5;
const events = [
  { id: 1, request_id: 1, type: 'created',        from: null,        to: null,          at: daysAgo(2) },
  { id: 1, request_id: 3, type: 'created',        from: "created",   to: 'in_review',          at: daysAgo(2) },
  { id: 2, request_id: 2, type: 'created',        from: null,        to: null,          at: daysAgo(8) },
  { id: 3, request_id: 2, type: 'status_changed', from: 'created',   to: 'in_review',   at: daysAgo(7) },
  { id: 4, request_id: 2, type: 'status_changed', from: 'in_review', to: 'in_progress', at: daysAgo(5) },
];

function logEvent(requestId, type, from = null, to = null) {
  events.push({ id: nextEventId++, request_id: requestId, type, from, to, at: new Date().toISOString() });
}

function toDto(r) {
  return {
    ...r,
    status: { code: r.status, label: STATUSES[r.status] },
    allowed_transitions: TRANSITIONS[r.status].map((code) => ({
      code,
      label: STATUSES[code],
    })),
  };
}

export async function listRequests() {
    await simulateNetwork();
    return db.map(toDto);
}

const STATUS_ORDER = ['created', 'in_review', 'in_progress', 'done', 'paused'];

export async function listStatuses() {
    await simulateNetwork();
    return STATUS_ORDER.map((code) => ({ code, label: STATUSES[code] }));
}

export async function transitionRequest(id, to) {
  await simulateNetwork();

  const r = db.find((x) => x.id === id);
  if (!r) throw new Error('Solicitud no encontrada');

  if (!TRANSITIONS[r.status].includes(to)) {
    throw new Error(`Transición no permitida: ${STATUSES[r.status]} → ${STATUSES[to] ?? to}`);
  }

    logEvent(r.id, 'status_changed', r.status, to);
    r.status = to;
    r.updated_at = new Date().toISOString();
    return toDto(r);
}

export async function createRequest({ title, description }) {
    await simulateNetwork();
    if (!title?.trim()) throw new Error('El título es obligatorio');

    const now = new Date().toISOString();
    const r = {
    id: nextId++,
    title: title.trim(),
    description: description?.trim() ?? '',
    status: 'created',
    created_at: now,
    updated_at: now,
    };
    db.push(r);
    logEvent(r.id, 'created');
    return toDto(r);
}

export async function updateRequest(id, { title, description }) {
  await simulateNetwork();
  const r = db.find((x) => x.id === id);
  if (!r) throw new Error('Solicitud no encontrada');

  if (title !== undefined) {
    const newTitle = title.trim();
    if (!newTitle) throw new Error('El título no puede quedar vacío');
    if (newTitle !== r.title) {
      logEvent(r.id, 'title_changed', r.title, newTitle);
      r.title = newTitle;
    }
  }
  if (description !== undefined) {
    const newDesc = description.trim();
    if (newDesc !== r.description) {
      logEvent(r.id, 'description_changed', r.description, newDesc);
      r.description = newDesc;
    }
  }

  r.updated_at = new Date().toISOString();
  return toDto(r);
}


export async function getHistory(id) {
  await simulateNetwork();
  if (!db.some((x) => x.id === id)) throw new Error('Solicitud no encontrada');

  const label = (code) => (code ? { code, label: STATUSES[code] } : null);

  return events
    .filter((e) => e.request_id === id)
    .map((e) => ({
      type: e.type,
      from: e.type === 'status_changed' ? label(e.from) : e.from,
      to: e.type === 'status_changed' ? label(e.to) : e.to,
      at: e.at,
    }));
}

const daysSince = (iso) => Math.floor((Date.now() - new Date(iso)) / DAY);

// Lo que haría el back: elegir SOLO lo necesario para resumir esta solicitud
function buildRequestPayload(r) {
  return {
    title: r.title,
    status: STATUSES[r.status],
    description: r.description.slice(0, 300),
    created_days_ago: daysSince(r.created_at),
    history: events
      .filter((e) => e.request_id === r.id)
      .map((e) => ({
        type: e.type,
        // Para estados mandamos el nombre; para títulos, el texto. De las descripciones solo el hecho.
        from: e.type === 'status_changed' ? STATUSES[e.from] : e.type === 'title_changed' ? e.from : undefined,
        to: e.type === 'status_changed' ? STATUSES[e.to] : e.type === 'title_changed' ? e.to : undefined,
        days_ago: daysSince(e.at),
      })),
  };
}

// Imita la respuesta del modelo
function fakeRequestSummary(p) {
  const parts = [`"${p.title}" está actualmente en ${p.status}.`];
  const moves = p.history.filter((e) => e.type === 'status_changed');

  if (moves.length === 0) {
    parts.push(`No ha cambiado de estado desde que se creó hace ${p.created_days_ago} día(s).`);
  } else {
    const path = [moves[0].from, ...moves.map((m) => m.to)].join(' → ');
    parts.push(`Ha tenido ${moves.length} cambio(s) de estado: ${path}.`);
    const pauses = moves.filter((m) => m.to === 'Pausada').length;
    if (pauses) parts.push(`Se pausó ${pauses} vez/veces.`);
    parts.push(`El último movimiento fue hace ${moves[moves.length - 1].days_ago} día(s).`);
  }

  const edits = p.history.filter((e) => e.type === 'title_changed' || e.type === 'description_changed').length;
  if (edits) parts.push(`Su título o descripción se editaron ${edits} vez/veces.`);

  return parts.join(' ');
}

export async function generateRequestSummary(id) {
  const r = db.find((x) => x.id === id);
  if (!r) throw new Error('Solicitud no encontrada');

  const payload = buildRequestPayload(r);
  console.info(`[mock] Datos que se enviarían al LLM (solicitud ${id}):`, payload);

  const ms = LLM.minDelay + Math.random() * (LLM.maxDelay - LLM.minDelay);
  await new Promise((resolve) => setTimeout(resolve, ms));

  if (Math.random() < LLM.failRate) {
    throw new Error('El servicio de resumen no está disponible en este momento.');
  }
    r.ai_summary = { text: fakeRequestSummary(payload), generated_at: new Date().toISOString() };
    return toDto(r);
}