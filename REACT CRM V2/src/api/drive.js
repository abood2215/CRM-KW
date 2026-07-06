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

export const getFilePreviewBlobUrl = (id) => client.get(`/drive/${id}/download`, { responseType: 'blob' }).then((res) => URL.createObjectURL(res.data));

export const downloadFile = (id, filename) =>
  client.get(`/drive/${id}/download`, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
