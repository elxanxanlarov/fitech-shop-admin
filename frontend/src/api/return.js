import api from './axios.js';

export const returnApi = {
  getAll: async () => {
    const response = await api.get('/return');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/return/${id}`);
    return response.data;
  },
  getBySaleId: async (saleId) => {
    const response = await api.get(`/return/sale/${saleId}`);
    return response.data;
  },
  create: async (returnData) => {
    const response = await api.post('/return', returnData);
    return response.data;
  },
  update: async (id, returnData) => {
    const response = await api.put(`/return/${id}`, returnData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/return/${id}`);
    return response.data;
  },
};

