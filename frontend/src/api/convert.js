import api from './axios.js';

export const convertApi = {
    getStats: async (params = {}) => {
        const response = await api.get('/convert/stats', { params });
        return response.data;
    },

    getDeletedProducts: async (params = {}) => {
        const response = await api.get('/convert/deleted-products', { params });
        return response.data;
    },

    /** @param {string[]} entities boş = hamısı; @param {string} branchId mütləqdir */
    assignToBranch: async (entities = [], branchId) => {
        const body = { entities, branchId };
        const response = await api.post('/convert/assign-to-branch', body);
        return response.data;
    },

    restoreDeleted: async (entities = [], params = {}, itemIds = []) => {
        const response = await api.post('/convert/restore-deleted', { entities, itemIds }, { params });
        return response.data;
    },

    hardDeleteAll: async (entities = [], params = {}, itemIds = []) => {
        const response = await api.post('/convert/hard-delete-all', { entities, itemIds }, { params });
        return response.data;
    },
};
