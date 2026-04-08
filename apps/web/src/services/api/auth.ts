import apiClient from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/v1/auth/login', { email, password });
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationName?: string;
  }) => {
    const { data } = await apiClient.post('/v1/auth/register', payload);
    return data;
  },

  logout: async () => {
    const { data } = await apiClient.post('/v1/auth/logout');
    return data;
  },

  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post('/v1/auth/refresh', { refreshToken });
    return data;
  },
};
