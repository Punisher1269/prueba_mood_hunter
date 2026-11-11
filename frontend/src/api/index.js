import * as mockApi from './mockApi';
import * as httpApi from './httpApi';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const api = useMock ? mockApi : httpApi;

if (import.meta.env.DEV) {
  console.info(`[api] Usando ${useMock ? 'MOCK' : `back real en ${import.meta.env.VITE_API_URL}`}`);
}

export const {
  listStatuses,
  listRequests,
  createRequest,
  updateRequest,
  transitionRequest,
  getHistory,
  generateRequestSummary,
} = api;