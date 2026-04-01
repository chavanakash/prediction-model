import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const datasetsApi = {
  getAll: () => api.get('/datasets'),
  getById: (id) => api.get(`/datasets/${id}`),
  upload: (formData, onProgress) =>
    api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
  delete: (id) => api.delete(`/datasets/${id}`),
};

export const predictionsApi = {
  run: (datasetId, options) => api.post(`/predictions/${datasetId}`, options),
  getByDataset: (datasetId) => api.get(`/predictions/dataset/${datasetId}`),
  getById: (id) => api.get(`/predictions/${id}`),
  getAll: () => api.get('/predictions'),
};

export default api;
