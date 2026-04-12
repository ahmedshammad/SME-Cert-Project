import apiClient from './client';

export const metricsApi = {
  getIssuanceMetrics: async () => {
    const { data } = await apiClient.get('/v1/metrics/issuance');
    return data;
  },

  getVerificationMetrics: async () => {
    const { data } = await apiClient.get('/v1/metrics/verification');
    return data;
  },

  getDashboardMetrics: async () => {
    const { data } = await apiClient.get('/v1/metrics/dashboard');
    return data;
  },
};
