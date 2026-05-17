import api from './axios.js';

export const ismayilliApi = {
  // Categories
  getAllCategories: async () => {
    const response = await api.get('/ismayilli/product/categories');
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/ismayilli/product/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/ismayilli/product/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/ismayilli/product/categories/${id}`);
    return response.data;
  },

  // Products
  getAllProducts: async (params = {}) => {
    const response = await api.get('/ismayilli/product/products', { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/ismayilli/product/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/ismayilli/product/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/ismayilli/product/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/ismayilli/product/products/${id}`);
    return response.data;
  },

  importExcel: async (formData) => {
    const response = await api.post('/ismayilli/product/products/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  bulkDeleteProducts: async (ids) => {
    const response = await api.post('/ismayilli/product/products/bulk-delete', { ids });
    return response.data;
  },

  adjustStock: async (id, data) => {
    const response = await api.post(`/ismayilli/product/products/${id}/adjust-stock`, data);
    return response.data;
  },

  getStockMovements: async (id) => {
    const response = await api.get(`/ismayilli/product/products/${id}/stock-movements`);
    return response.data;
  },

  getSalesHistory: async (id) => {
    const response = await api.get(`/ismayilli/product/products/${id}/sales-history`);
    return response.data;
  },

  // Sales
  getAllSales: async () => {
    const response = await api.get('/ismayilli/sale');
    return response.data;
  },

  createSale: async (saleData) => {
    const response = await api.post('/ismayilli/sale', saleData);
    return response.data;
  },

  deleteSale: async (id) => {
    const response = await api.delete(`/ismayilli/sale/${id}`);
    return response.data;
  },

  deleteAllSales: async () => {
    const response = await api.delete('/ismayilli/sale');
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await api.get('/ismayilli/statistics');
    return response.data;
  }
};
