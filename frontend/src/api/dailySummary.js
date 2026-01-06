import api from './axios.js';

export const dailySummaryApi = {
  // Siyahı və toplu statistika
  getAll: async (params = {}) => {
    const response = await api.get('/daily-summary', { params });
    return response.data;
  },

  // ID-yə görə detail
  getById: async (id) => {
    const response = await api.get(`/daily-summary/${id}`);
    return response.data;
  },

  // Günlük yekun yarat / yenilə (backend eyni gündə varsa update edir)
  create: async (payload) => {
    const response = await api.post('/daily-summary', payload);
    return response.data;
  },
};


