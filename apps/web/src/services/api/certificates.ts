import apiClient from './client';

export const certificateApi = {
  getIssuerStats: async () => {
    const { data } = await apiClient.get('/v1/certificates/stats');
    return data;
  },

  getRecentCertificates: async (params: { limit: number }) => {
    const { data } = await apiClient.get('/v1/certificates/recent', { params });
    return data;
  },

  getCertificate: async (id: string) => {
    const { data } = await apiClient.get(`/v1/certificates/${id}`);
    return data;
  },

  issueCertificate: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/v1/certificates', payload);
    return data;
  },

  revokeCertificate: async (id: string, reason: string) => {
    const { data } = await apiClient.post(`/v1/certificates/${id}/revoke`, { reason });
    return data;
  },

  verifyCertificate: async (id: string) => {
    const { data } = await apiClient.get(`/v1/certificates/${id}/verify`);
    return data;
  },

  verifyByHash: async (hash: string) => {
    const { data } = await apiClient.get(`/v1/certificates/verify-by-hash/${hash}`);
    return data;
  },

  getHolderCertificates: async () => {
    const { data } = await apiClient.get('/v1/certificates/holder');
    return data;
  },

  getTemplates: async () => {
    const { data } = await apiClient.get('/v1/templates');
    return data;
  },

  createTemplate: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/v1/templates', payload);
    return data;
  },

  // Blockchain status endpoints
  getBlockchainStatus: async () => {
    const { data } = await apiClient.get('/health/blockchain');
    return data;
  },

  getRecentBlocks: async (count = 5) => {
    const { data } = await apiClient.get('/health/blockchain/blocks', { params: { count } });
    return data;
  },

  getBlock: async (blockNumber: number) => {
    const { data } = await apiClient.get(`/health/blockchain/blocks/${blockNumber}`);
    return data;
  },
};
