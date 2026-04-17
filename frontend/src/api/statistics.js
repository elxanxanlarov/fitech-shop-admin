import api from './axios.js';

export const statisticsApi = {
  getOverall: async (startDate = null, endDate = null, branchId = null) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/overall', { params });
    return response.data;
  },
  getByDateRange: async (startDate, endDate, branchId = null) => {
    const params = { startDate, endDate };
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/date-range', { params });
    return response.data;
  },
  getDaily: async (days = 7, branchId = null) => {
    const params = { days };
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/daily', { params });
    return response.data;
  },
  getTopProducts: async (limit = 10, startDate = null, endDate = null, branchId = null) => {
    const params = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/top-products', { params });
    return response.data;
  },
  getByPaymentType: async (startDate = null, endDate = null, branchId = null) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/payment-type', { params });
    return response.data;
  },
  getCustomers: async (startDate = null, endDate = null, branchId = null) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (branchId != null && branchId !== '') params.branchId = branchId;
    const response = await api.get('/statistics/customers', { params });
    return response.data;
  },
};

