import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

const api = axios.create({ baseURL: API_BASE });

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
  getAll: () => api.get('/leases'),
  getById: (id) => api.get(`/leases/${id}`),
  create: (data) => api.post('/leases', data),
  update: (id, data) => api.put(`/leases/${id}`, data),
  delete: (id) => api.delete(`/leases/${id}`),
  analyze: (data) => api.post('/ai/analyze-lease', data),
};

export const escalationAPI = {
  getAll: () => api.get('/escalations'),
  getById: (id) => api.get(`/escalations/${id}`),
  create: (data) => api.post('/escalations', data),
  update: (id, data) => api.put(`/escalations/${id}`, data),
  delete: (id) => api.delete(`/escalations/${id}`),
  analyze: (data) => api.post('/ai/analyze-escalation', data),
};

export const negotiationAPI = {
  getAll: () => api.get('/negotiations'),
  getById: (id) => api.get(`/negotiations/${id}`),
  create: (data) => api.post('/negotiations', data),
  update: (id, data) => api.put(`/negotiations/${id}`, data),
  delete: (id) => api.delete(`/negotiations/${id}`),
  analyze: (data) => api.post('/ai/analyze-negotiation', data),
};

export const portfolioAPI = {
  getAll: () => api.get('/portfolio'),
  getById: (id) => api.get(`/portfolio/${id}`),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
  analyze: (data) => api.post('/ai/analyze-portfolio', data),
};

export const marketCompAPI = {
  getAll: () => api.get('/market-comps'),
  getById: (id) => api.get(`/market-comps/${id}`),
  create: (data) => api.post('/market-comps', data),
  update: (id, data) => api.put(`/market-comps/${id}`, data),
  delete: (id) => api.delete(`/market-comps/${id}`),
  analyze: (data) => api.post('/ai/analyze-market-comp', data),
};

export default api;
