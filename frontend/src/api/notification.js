import api from './axios.js';

export const notificationApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/notification', { params });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id) => {
    const response = await api.put(`/notification/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put('/notification/read-all');
    return response.data;
  },
};

