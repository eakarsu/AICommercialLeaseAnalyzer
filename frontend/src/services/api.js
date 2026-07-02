import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

const api = axios.create({ baseURL: API_BASE });

const normalizeListResponse = (response, keys = []) => {
  const payload = response.data;
  if (Array.isArray(payload)) return response;

  const list = [
    payload?.data,
    ...keys.map((key) => payload?.[key])
  ].find(Array.isArray);

  return {
    ...response,
    data: list || [],
    pagination: payload?.pagination
  };
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const leaseAPI = {
  getAll: () => api.get('/leases').then((response) => normalizeListResponse(response, ['leases'])),
  getById: (id) => api.get(`/leases/${id}`),
  create: (data) => api.post('/leases', data),
  update: (id, data) => api.put(`/leases/${id}`, data),
  delete: (id) => api.delete(`/leases/${id}`),
  analyze: (data) => api.post('/ai/analyze-lease', data),
};

export const escalationAPI = {
  getAll: () => api.get('/escalations').then((response) => normalizeListResponse(response, ['escalations'])),
  getById: (id) => api.get(`/escalations/${id}`),
  create: (data) => api.post('/escalations', data),
  update: (id, data) => api.put(`/escalations/${id}`, data),
  delete: (id) => api.delete(`/escalations/${id}`),
  analyze: (data) => api.post('/ai/analyze-escalation', data),
};

export const negotiationAPI = {
  getAll: () => api.get('/negotiations').then((response) => normalizeListResponse(response, ['negotiations'])),
  getById: (id) => api.get(`/negotiations/${id}`),
  create: (data) => api.post('/negotiations', data),
  update: (id, data) => api.put(`/negotiations/${id}`, data),
  delete: (id) => api.delete(`/negotiations/${id}`),
  analyze: (data) => api.post('/ai/analyze-negotiation', data),
};

export const portfolioAPI = {
  getAll: () => api.get('/portfolio').then((response) => normalizeListResponse(response, ['portfolio', 'properties'])),
  getById: (id) => api.get(`/portfolio/${id}`),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
  analyze: (data) => api.post('/ai/analyze-portfolio', data),
};

export const marketCompAPI = {
  getAll: () => api.get('/market-comps').then((response) => normalizeListResponse(response, ['marketComps', 'comps'])),
  getById: (id) => api.get(`/market-comps/${id}`),
  create: (data) => api.post('/market-comps', data),
  update: (id, data) => api.put(`/market-comps/${id}`, data),
  delete: (id) => api.delete(`/market-comps/${id}`),
  analyze: (data) => api.post('/ai/analyze-market-comp', data),
};

// Advanced AI tools (NEW custom non-CRUD)
export const advancedAI = {
  leaseComparisonReport: (lease_ids, lease_snapshots = []) => api.post('/ai/lease-comparison', { lease_ids, lease_snapshots }),
  subleaseAnalysis: (lease_id, sublease_terms, lease_snapshot) => api.post('/ai/sublease-analysis', { lease_id, sublease_terms, lease_snapshot }),
  earlyTermination: (lease_id, exit_scenario, lease_snapshot) => api.post('/ai/early-termination', { lease_id, exit_scenario, lease_snapshot }),
  leaseAudit: (lease_id, lease_snapshot) => api.post('/ai/lease-audit', { lease_id, lease_snapshot }),
  extractClauses: (document_text, lease_id, focus, lease_snapshot) => api.post('/ai/extract-clauses', { document_text, lease_id, focus, lease_snapshot }),
};

// Lease alerts / market alerts (calendar-driven notifications)
export const alertsAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/lease-alerts?page=${page}&limit=${limit}`).then((response) => normalizeListResponse(response, ['alerts'])),
  getDue: (days = 90) => api.get(`/lease-alerts/due?days=${days}`),
  getById: (id) => api.get(`/lease-alerts/${id}`),
  create: (data) => api.post('/lease-alerts', data),
  update: (id, data) => api.put(`/lease-alerts/${id}`, data),
  delete: (id) => api.delete(`/lease-alerts/${id}`),
};

// Notifications inbox
export const notificationsAPI = {
  getAll: () => api.get('/notifications').then((response) => normalizeListResponse(response, ['notifications', 'items'])),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// App assistant: natural-language CRUD actions over the same backend tables
export const chatbotAPI = {
  sendMessage: (message, options = {}) => api.post('/chatbot/message', { message, ...options }),
  getHistory: () => api.get('/chatbot/history'),
  clearHistory: () => api.delete('/chatbot/history'),
};

export const auditAPI = {
  getAll: () => api.get('/audit-logs').then((response) => normalizeListResponse(response, ['logs', 'auditLogs'])),
  getById: (id) => api.get(`/audit-logs/${id}`),
  create: (data) => api.post('/audit-logs', data),
  update: (id, data) => api.put(`/audit-logs/${id}`, data),
  delete: (id) => api.delete(`/audit-logs/${id}`),
};

// CSV exports
export const exportAPI = {
  leasesCSV: () => api.get('/export/leases', { responseType: 'blob' }),
  escalationsCSV: () => api.get('/export/escalations', { responseType: 'blob' }),
  negotiationsCSV: () => api.get('/export/negotiations', { responseType: 'blob' }),
  portfolioCSV: () => api.get('/export/portfolio', { responseType: 'blob' }),
  marketCompsCSV: () => api.get('/export/market-comps', { responseType: 'blob' }),
};

export default api;
