import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    console.log('Making login API request with data:', { ...data, password: '[REDACTED]' });
    try {
      const response = await api.post('/auth/login', data);
      console.log('Login API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  validateResetToken: async (token: string) => {
    const response = await api.get(`/auth/reset-password/${token}`);
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },
};

export const pdfService = {
  upload: async (file: File, title: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title);
    const response = await api.post('/pdf/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/pdf');
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get(`/pdf/${id}`);
    return response.data;
  },

  share: async (id: string, email: string) => {
    const response = await api.post(`/pdf/${id}/share`, { email });
    return response.data;
  },

  addComment: async (id: string, text: string) => {
    const response = await api.post(`/pdf/${id}/comments`, { text });
    return response.data;
  },

  addReply: async (id: string, commentId: string, text: string) => {
    const response = await api.post(`/pdf/${id}/comments/${commentId}/replies`, { text, commentId });
    return response.data;
  },

  generateShareLink: async (id: string) => {
    const response = await api.post(`/pdf/${id}/share-link`);
    return response.data.link;
  },

  inviteUsers: async (id: string, emails: string[]) => {
    const response = await api.post(`/pdf/${id}/invite`, { emails });
    return response.data;
  },

  getInvitedUsers: async (id: string) => {
    const response = await api.get(`/pdf/${id}/invited`);
    return response.data;
  },

  removeInvitedUser: async (id: string, email: string) => {
    const response = await api.delete(`/pdf/${id}/invited/${email}`);
    return response.data;
  },

  getSharedPDF: async (token: string, email?: string) => {
    const params = email ? { email } : {};
    const response = await api.get(`/pdf/shared/${token}`, { params });
    return response.data;
  },

  addSharedComment: async (token: string, text: string, guestName: string) => {
    const response = await api.post(`/pdf/shared/${token}/comments`, { text, guestName });
    return response.data;
  },

  addSharedReply: async (token: string, commentId: string, text: string, guestName: string) => {
    const response = await api.post(`/pdf/shared/${token}/comments/${commentId}/replies`, { text, guestName });
    return response.data;
  },
};

export default api; 