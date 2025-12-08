import api from './axios.js';

export const activityLogApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/activity-log', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/activity-log/${id}`);
    return response.data;
  },
  getByStaff: async (staffId, params = {}) => {
    const response = await api.get(`/activity-log/staff/${staffId}`, { params });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/activity-log/${id}`);
    return response.data;
  },
};

