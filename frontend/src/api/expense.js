import api from './axios.js';

export const expenseApi = {
  // Get all expenses
  getAll: async (params = {}) => {
    const response = await api.get('/expense', { params });
    return response.data;
  },

  // Get expense by ID
  getById: async (id) => {
    const response = await api.get(`/expense/${id}`);
    return response.data;
  },

  // Create expense
  create: async (expenseData) => {
    const response = await api.post('/expense', expenseData);
    return response.data;
  },

  // Update expense
  update: async (id, expenseData) => {
    const response = await api.put(`/expense/${id}`, expenseData);
    return response.data;
  },

  // Delete expense
  delete: async (id) => {
    const response = await api.delete(`/expense/${id}`);
    return response.data;
  },
};

