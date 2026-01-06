import api from './axios.js';

export const finalDeliveryApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/final-delivery', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/final-delivery/${id}`);
    return response.data;
  },
  create: async (deliveryData) => {
    const response = await api.post('/final-delivery', deliveryData);
    return response.data;
  },
  update: async (id, deliveryData) => {
    const response = await api.put(`/final-delivery/${id}`, deliveryData);
    return response.data;
  },
  delete: async (id, deleteType = 'SOFT') => {
    const response = await api.delete(`/final-delivery/${id}`, {
      data: { deleteType }
    });
    return response.data;
  },
  preview: async (startDate, endDate) => {
    const response = await api.get('/final-delivery/preview', {
      params: { startDate, endDate }
    });
    return response.data;
  },
  // FinalDeliveryItem əməliyyatları
  updateItem: async (itemId, itemData) => {
    const response = await api.put(`/final-delivery/items/${itemId}`, itemData);
    return response.data;
  },
  addItem: async (deliveryId, itemData) => {
    const response = await api.post(`/final-delivery/${deliveryId}/items`, itemData);
    return response.data;
  },
  deleteItem: async (itemId) => {
    const response = await api.delete(`/final-delivery/items/${itemId}`);
    return response.data;
  },
};

