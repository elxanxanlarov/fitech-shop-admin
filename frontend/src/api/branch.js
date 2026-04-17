import api from './axios.js';

export const branchApi = {
  getAll: async () => {
    const response = await api.get('/branch');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/branch/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/branch', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/branch/${id}`, data);
    return response.data;
  },
  getStocks: async (id) => {
    const response = await api.get(`/branch/${id}/stocks`);
    return response.data;
  },
  syncWithCentral: async (id) => {
    const response = await api.post(`/branch/${id}/sync-central`);
    return response.data;
  },
  getAllBranchStocks: async () => {
    const response = await api.get('/branch/all-stocks');
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/branch/${id}`);
    return response.data;
  }
};
