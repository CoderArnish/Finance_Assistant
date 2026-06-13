import axios from 'axios';

const API_BASE_URL = '/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Global 401/403 → redirect to login
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
  register: (data)       => api.post('/auth/register', data),
  login:    (data)       => api.post('/auth/login',    data),
};

export const transactionAPI = {
  getAll:     (params)   => api.get('/transactions',       { params }),
  create:     (data)     => api.post('/transactions',      data),
  update:     (id, data) => api.put(`/transactions/${id}`, data),
  delete:     (id)       => api.delete(`/transactions/${id}`),
  getSummary: ()         => api.get('/transactions/summary'),
};

export const accountAPI = {
  getAll:  ()            => api.get('/accounts'),
  create:  (data)        => api.post('/accounts',      data),
  update:  (id, data)    => api.put(`/accounts/${id}`, data),   // ← NEW
  delete:  (id)          => api.delete(`/accounts/${id}`),      // ← NEW
};

// ── NEW ──
export const budgetAPI = {
  getAll:  ()            => api.get('/budgets'),
  create:  (data)        => api.post('/budgets',      data),
  update:  (id, data)    => api.put(`/budgets/${id}`, data),
  delete:  (id)          => api.delete(`/budgets/${id}`),
};

export default api;