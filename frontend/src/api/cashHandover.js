import api from './axios.js';

export const cashHandoverApi = {
  // Get all cash handovers
  getAll: async (params = {}) => {
    const response = await api.get('/cash-handover', { params });
    return response.data;
  },

  // Get cash handover by ID
  getById: async (id) => {
    const response = await api.get(`/cash-handover/${id}`);
    return response.data;
  },

  // Create cash handover
  create: async (cashHandoverData) => {
    const response = await api.post('/cash-handover', cashHandoverData);
    return response.data;
  },

  // Update cash handover
  update: async (id, cashHandoverData) => {
    const response = await api.put(`/cash-handover/${id}`, cashHandoverData);
    return response.data;
  },

  // Delete cash handover
  delete: async (id) => {
    const response = await api.delete(`/cash-handover/${id}`);
    return response.data;
  },
};

