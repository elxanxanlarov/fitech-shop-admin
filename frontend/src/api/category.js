import api from './axios.js';

export const categoryApi = {
  // Get all categories
  getAll: async () => {
    const response = await api.get('/category');
    return response.data;
  },

  // Get category by ID
  getById: async (id) => {
    const response = await api.get(`/category/${id}`);
    return response.data;
  },

  // Create category
  create: async (categoryData) => {
    const response = await api.post('/category', categoryData);
    return response.data;
  },

  // Update category
  update: async (id, categoryData) => {
    const response = await api.put(`/category/${id}`, categoryData);
    return response.data;
  },

  // Delete category
  delete: async (id) => {
    const response = await api.delete(`/category/${id}`);
    return response.data;
  },
};

