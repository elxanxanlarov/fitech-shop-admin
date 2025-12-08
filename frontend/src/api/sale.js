import api from './axios.js';

export const saleApi = {
  getAll: async () => {
    const response = await api.get('/sale');
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
  delete: async (id) => {
    const response = await api.delete(`/sale/${id}`);
    return response.data;
  },
};

