import api from './axios.js';

export const stockApi = {
  // Get all stock movements
  getAll: async (productId = null) => {
    const params = productId ? { productId } : {};
    const response = await api.get('/stock', { params });
    return response.data;
  },

  // Get stock movement by ID
  getById: async (id) => {
    const response = await api.get(`/stock/${id}`);
    return response.data;
  },

  // Create stock movement
  create: async (stockData) => {
    const response = await api.post('/stock', stockData);
    return response.data;
  },

  // Delete stock movement
  delete: async (id) => {
    const response = await api.delete(`/stock/${id}`);
    return response.data;
  },
};

