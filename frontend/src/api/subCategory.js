import api from './axios.js';

export const subCategoryApi = {
  // Get all subcategories
  getAll: async (categoryId = null) => {
    const params = categoryId ? { categoryId } : {};
    const response = await api.get('/subcategory', { params });
    return response.data;
  },

  // Get subcategory by ID
  getById: async (id) => {
    const response = await api.get(`/subcategory/${id}`);
    return response.data;
  },

  // Create subcategory
  create: async (subCategoryData) => {
    const response = await api.post('/subcategory', subCategoryData);
    return response.data;
  },

  // Update subcategory
  update: async (id, subCategoryData) => {
    const response = await api.put(`/subcategory/${id}`, subCategoryData);
    return response.data;
  },

  // Delete subcategory
  delete: async (id) => {
    const response = await api.delete(`/subcategory/${id}`);
    return response.data;
  },
};

