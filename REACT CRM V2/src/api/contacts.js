import client from './client';

export const getContacts = (params) => client.get('/contacts', { params }).then((res) => res.data);

export const getContact = (id) => client.get(`/contacts/${id}`).then((res) => res.data);

export const getPipeline = () => client.get('/contacts/pipeline').then((res) => res.data.pipeline);

export const getPipelineStage = (stage, offset) =>
  client.get(`/contacts/pipeline/${stage}`, { params: { offset } }).then((res) => res.data);

export const getTimeline = (id) => client.get(`/contacts/${id}/timeline`).then((res) => res.data);

export const createContact = (data) => client.post('/contacts', data).then((res) => res.data);

export const updateContact = (id, data) => client.put(`/contacts/${id}`, data).then((res) => res.data);

export const deleteContact = (id) => client.delete(`/contacts/${id}`).then((res) => res.data);

export const importContactsCsv = (file, contactListId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (contactListId) formData.append('contact_list_id', contactListId);

  return client.post('/contacts/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const exportContactsCsv = () => client.get('/contacts/export/csv', { responseType: 'blob' }).then((res) => res.data);

export const optOutContact = (id) => client.post(`/contacts/${id}/opt-out`).then((res) => res.data);

export const blacklistContact = (id) => client.post(`/contacts/${id}/blacklist`).then((res) => res.data);

export const unblacklistContact = (id) => client.post(`/contacts/${id}/unblacklist`).then((res) => res.data);

export const destroyAllContacts = () => client.delete('/contacts/destroy-all').then((res) => res.data);

export const bulkDestroyContacts = (ids) => client.post('/contacts/bulk-destroy', { ids }).then((res) => res.data);

export const bulkBlacklistContacts = (ids) => client.post('/contacts/bulk-blacklist', { ids }).then((res) => res.data);

export const getSegmentCount = (filters) => client.post('/contacts/segment-count', filters).then((res) => res.data.count);
