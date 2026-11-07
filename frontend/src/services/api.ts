import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const DatasetService = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: () => api.get('/datasets'),
  getById: (id: string) => api.get(`/datasets/${id}`),
  preview: (id: string) => api.get(`/datasets/${id}/preview`),
  summary: (id: string) => api.get(`/datasets/${id}/summary`),
  delete: (id: string) => api.delete(`/datasets/${id}`),
};

export const AnalysisService = {
  run: (params: any) => api.post('/analysis/run', params),
  getById: (id: string) => api.get(`/analysis/${id}`),
  getItemsets: (id: string) => api.get(`/analysis/${id}/itemsets`),
  getRules: (id: string, params: Record<string, string | number> = {}) => api.get(`/analysis/${id}/rules`, { params }),
  getHistory: () => api.get('/analysis/history'),
  getRecommendations: (id: string, products: string[]) => api.get(`/analysis/${id}/recommendations`, { params: { products: products.join(',') } }),
  export: (id: string, kind: 'rules' | 'itemsets' = 'rules') => api.get(`/analysis/${id}/export`, { params: { kind }, responseType: 'blob' }),
  delete: (id: string) => api.delete(`/analysis/${id}`),
};
