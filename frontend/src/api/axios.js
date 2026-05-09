import axios from 'axios';

// Axios instance yaradırıq
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Bridge for systemic date/data typo in the backend
    // If backend returns 'date' instead of 'data', we normalize it here
    if (response.data && response.data.date !== undefined && response.data.data === undefined) {
      response.data.data = response.data.date;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token etibarsızdır və ya iş saatı bitib
      sessionStorage.removeItem('token');
      if (window.location.pathname !== '/dashboard/login') {
        window.location.href = '/dashboard/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

