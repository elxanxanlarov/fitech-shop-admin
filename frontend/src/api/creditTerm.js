import api from './axios.js';

export const creditTermApi = {
  // Get all credit terms
  getAll: async () => {
    const response = await api.get('/credit-term');
    return response.data;
  },

  // Get credit term by ID
  getById: async (id) => {
    const response = await api.get(`/credit-term/${id}`);
    return response.data;
  },

  // Create credit term
  create: async (creditTermData) => {
    const response = await api.post('/credit-term', creditTermData);
    return response.data;
  },

  // Update credit term
  update: async (id, creditTermData) => {
    const response = await api.put(`/credit-term/${id}`, creditTermData);
    return response.data;
  },

  // Delete credit term
  delete: async (id) => {
    const response = await api.delete(`/credit-term/${id}`);
    return response.data;
  },
};

