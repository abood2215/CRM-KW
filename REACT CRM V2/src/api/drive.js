import client from './client';

export const getFiles = (params) => client.get('/drive', { params }).then((res) => res.data);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return client.post('/drive/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const deleteFile = (id) => client.delete(`/drive/${id}`).then((res) => res.data);

export const downloadFileUrl = (id) => `${client.defaults.baseURL}/drive/${id}/download`;
