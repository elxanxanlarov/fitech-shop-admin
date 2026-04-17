import api from './axios.js';

export const productApi = {
  // Get all products
  getAll: async (paramsOrQuery = '') => {
    if (typeof paramsOrQuery === 'string') {
      const response = await api.get(`/product${paramsOrQuery}`);
      return response.data;
    }
    const response = await api.get('/product', { params: paramsOrQuery });
    return response.data;
  },

  // Get product by ID
  getById: async (id, params = {}) => {
    const response = await api.get(`/product/${id}`, { params });
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

  // Update product stock only
  updateStock: async (id, stockData) => {
    const response = await api.put(`/product/${id}/stock`, stockData);
    return response.data;
  },

  // Delete product
  delete: async (id, deleteType = 'SOFT') => {
    const response = await api.delete(`/product/${id}`, {
      data: { deleteType }
    });
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

  // Get product sales
  getSales: async (productId) => {
    const response = await api.get(`/product/${productId}/sales`);
    return response.data;
  },

  // Get product returns
  getReturns: async (productId) => {
    const response = await api.get(`/product/${productId}/returns`);
    return response.data;
  },
};

