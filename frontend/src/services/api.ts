import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartattend_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token expiration & auth failure handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const errorMsg = error.response.data?.error || '';
      if (errorMsg.includes('Access token required') || errorMsg.includes('Invalid or expired token')) {
        console.warn('[API INTERCEPTOR] Token expired or missing. Clearing local session.');
        window.dispatchEvent(new Event('smartattend_auth_error'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
