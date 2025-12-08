import api from './axios.js';

export const roleApi = {
  // Get all roles
  getAll: async () => {
    const response = await api.get('/role');
    return response.data;
  },

  // Get role by ID
  getById: async (id) => {
    const response = await api.get(`/role/${id}`);
    return response.data;
  },

  // Create role
  create: async (roleData) => {
    const response = await api.post('/role', roleData);
    return response.data;
  },

  // Update role
  update: async (id, roleData) => {
    const response = await api.put(`/role/${id}`, roleData);
    return response.data;
  },

  // Delete role
  delete: async (id) => {
    const response = await api.delete(`/role/${id}`);
    return response.data;
  },
};

