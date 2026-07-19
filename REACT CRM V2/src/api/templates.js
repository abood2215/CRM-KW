import client from './client';

export const getTemplates = (params) => client.get('/templates', { params }).then((res) => res.data.templates);

export const createTemplate = (data) => client.post('/templates', data).then((res) => res.data);

export const updateTemplate = (id, data) => client.put(`/templates/${id}`, data).then((res) => res.data);

export const deleteTemplate = (id) => client.delete(`/templates/${id}`).then((res) => res.data);

export const syncTemplates = (whatsappNumberId) =>
  client.post('/templates/sync', { whatsapp_number_id: whatsappNumberId }).then((res) => res.data);

export const uploadTemplateImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);

  return client.post('/templates/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const getTemplateAnalytics = (id) => client.get(`/templates/${id}/analytics`).then((res) => res.data.analytics);
