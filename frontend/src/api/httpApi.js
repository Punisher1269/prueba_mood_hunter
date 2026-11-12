const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10000;

// Mensajes por defecto si el back no envía uno
const STATUS_MESSAGES = {
  404: 'La solicitud no existe.',
  409: 'La transición no está permitida.',
  422: 'Los datos enviados no son válidos.',
  503: 'El servicio no está disponible en este momento.',
  504: 'El servidor tardó demasiado en responder.',
};

// FastAPI devuelve { detail: "texto" } o, en errores de validación, { detail: [{ msg: "..." }] }
function extractMessage(body, status) {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return STATUS_MESSAGES[status] ?? `Error del servidor (${status}).`;
}

async function request(path, { method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder.');
    throw new Error('No se pudo conectar con el servidor. Intenta de nuevo.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractMessage(data, res.status));
  return data;
}

// ─── Las mismas funciones que mockApi.js ───

export function listStatuses() {
  return request('/api/statuses');
}

export function listRequests() {
  return request('/api/requests');
}

export function createRequest({ title, description }) {
  return request('/api/requests', { method: 'POST', body: { title, description } });
}

export function updateRequest(id, changes) {
  return request(`/api/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
}

export function transitionRequest(id, to) {
  return request(`/api/requests/${encodeURIComponent(id)}/transitions`, { method: 'POST', body: { to } });
}

export function getTransitions(id) {
  return request(`/api/requests/${encodeURIComponent(id)}/transitions`);
}

export function getHistory(id) {
  return request(`/api/requests/${encodeURIComponent(id)}/history`);
}

export function generateRequestSummary(id) {
  // Más tiempo que el timeout de App (15 s) para que el mensaje que vea el usuario sea el de App
  return request(`/api/requests/${encodeURIComponent(id)}/summary`, { method: 'POST', timeout: 20000 });
}