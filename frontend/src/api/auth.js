import api from './axios.js';

export const authApi = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    
    // SessionStorage-dan token sil
    sessionStorage.removeItem('token');
    
    return response.data;
  },

  // Get current user (me)
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

