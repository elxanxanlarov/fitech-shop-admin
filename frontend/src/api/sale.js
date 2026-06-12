import api from './axios.js';

export const saleApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/sale', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/sale/${id}`);
    return response.data;
  },
  create: async (saleData) => {
    const response = await api.post('/sale', saleData);
    return response.data;
  },
  update: async (id, saleData) => {
    const response = await api.put(`/sale/${id}`, saleData);
    return response.data;
  },
  delete: async (id, deleteType = 'SOFT') => {
    const response = await api.delete(`/sale/${id}`, {
      data: { deleteType }
    });
    return response.data;
  },
  bulkDelete: async (ids, deleteType = 'SOFT') => {
    const response = await api.post('/sale/bulk-delete', { ids, deleteType });
    return response.data;
  },
};

