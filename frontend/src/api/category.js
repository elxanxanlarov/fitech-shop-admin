import api from './axios.js';

export const categoryApi = {
  // Get all categories
  getAll: async (params = {}) => {
    const response = await api.get('/category', { params });
    return response.data;
  },

  // Mövcud kateqoriyaları Kürdəxanı-ya bağla
  assignToKurdaxani: async () => {
    const response = await api.post('/category/assign-kurdaxani');
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
  delete: async (id, deleteType = 'SOFT') => {
    const response = await api.delete(`/category/${id}`, {
      data: { deleteType }
    });
    return response.data;
  },
};

