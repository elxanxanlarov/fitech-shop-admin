import api from './axios.js';

export const receiptApi = {
  getById: async (id) => {
    const response = await api.get(`/receipt/${id}`);
    return response.data;
  },
  getBySaleId: async (saleId) => {
    const response = await api.get(`/receipt/sale/${saleId}`);
    return response.data;
  },
};

