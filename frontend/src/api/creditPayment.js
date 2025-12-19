import api from './axios.js';

export const creditPaymentApi = {
  // Make credit payment
  makePayment: async (paymentData) => {
    const response = await api.post('/credit-payment', paymentData);
    return response.data;
  },

  // Get credit payments for a sale
  getBySaleId: async (saleId) => {
    const response = await api.get(`/credit-payment/sale/${saleId}`);
    return response.data;
  },

  // Get all active credits
  getActiveCredits: async () => {
    const response = await api.get('/credit-payment/active');
    return response.data;
  },
};

