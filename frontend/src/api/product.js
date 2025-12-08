import api from './axios.js';

export const productApi = {
  // Get all products
  getAll: async () => {
    const response = await api.get('/product');
    return response.data;
  },

  // Get product by ID
  getById: async (id) => {
    const response = await api.get(`/product/${id}`);
    return response.data;
  },

  // Create product
  create: async (productData) => {
    const response = await api.post('/product', productData);
    return response.data;
  },

  // Update product
  update: async (id, productData) => {
    const response = await api.put(`/product/${id}`, productData);
    return response.data;
  },

  // Delete product
  delete: async (id) => {
    const response = await api.delete(`/product/${id}`);
    return response.data;
  },

  // Import products from Excel
  importFromExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/product/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

