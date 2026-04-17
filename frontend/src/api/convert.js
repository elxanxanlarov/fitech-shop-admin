import api from './axios.js';

export const convertApi = {
    getStats: async () => {
        const response = await api.get('/convert/stats');
        return response.data;
    },
    /** @param {string[]} entities boş = hamısı; @param {string|null} branchId verilməsə backend Kürdəxanı istifadə edir */
    assignToKurdaxani: async (entities = [], branchId = null) => {
        const body = { entities };
        if (branchId) body.branchId = branchId;
        const response = await api.post('/convert/assign-kurdaxani', body);
        return response.data;
    },
    restoreDeleted: async (entities = []) => {
        const response = await api.post('/convert/restore-deleted', { entities });
        return response.data;
    },
    hardDeleteAll: async (entities = []) => {
        const response = await api.post('/convert/hard-delete-all', { entities });
        return response.data;
    },
};
