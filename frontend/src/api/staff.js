import api from './axios.js';

export const staffApi = {
  // Get all staff
  getAll: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  // Get staff by ID
  getById: async (id) => {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  // Create staff
  create: async (staffData) => {
    const response = await api.post('/staff', staffData);
    return response.data;
  },

  // Update staff
  update: async (id, staffData) => {
    const response = await api.put(`/staff/${id}`, staffData);
    return response.data;
  },

  // Delete staff
  delete: async (id) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },
};

