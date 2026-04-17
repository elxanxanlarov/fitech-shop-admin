import api from './axios.js';

export const stockTransferApi = {
  getAll: async (params) => {
    const response = await api.get('/stock-transfer', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/stock-transfer', data);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/stock-transfer/${id}/status`, { status });
    return response.data;
  },
  createFilialComplete: async (data) => {
    const response = await api.post('/stock-transfer/filial-complete', data);
    return response.data;
  }
};
