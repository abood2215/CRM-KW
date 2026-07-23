import client from './client';

// Template sends may carry a per-send header file (header_media) — those must go up as
// multipart. Everything else keeps the plain JSON body the backend already expects.
const toFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v) => formData.append(`${key}[]`, v));
    else formData.append(key, value);
  });
  return formData;
};

const postJsonOrMultipart = (url, data) =>
  data.header_media
    ? client.post(url, toFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } })
    : client.post(url, data);

export const getConversations = (params) => client.get('/conversations', { params }).then((res) => res.data);

export const getConversation = (id) => client.get(`/conversations/${id}`).then((res) => res.data.conversation);

export const startConversation = (data) => postJsonOrMultipart('/conversations', data).then((res) => res.data);

export const getMessages = (conversationId, params) =>
  client.get(`/conversations/${conversationId}/messages`, { params }).then((res) => res.data);

export const sendMessage = (conversationId, data) =>
  client.post(`/conversations/${conversationId}/messages`, data).then((res) => res.data);

export const sendTemplateMessage = (conversationId, data) =>
  postJsonOrMultipart(`/conversations/${conversationId}/send-template`, data).then((res) => res.data);

export const addNote = (conversationId, content) =>
  client.post(`/conversations/${conversationId}/notes`, { content }).then((res) => res.data);

export const updateStatus = (conversationId, status) =>
  client.put(`/conversations/${conversationId}/status`, { status }).then((res) => res.data);

export const assignConversation = (conversationId, userId) =>
  client.put(`/conversations/${conversationId}/assign`, { user_id: userId }).then((res) => res.data);

export const sendTyping = (conversationId) =>
  client.post(`/conversations/${conversationId}/typing`).then((res) => res.data);

export const reactToMessage = (conversationId, messageId, emoji) =>
  client.post(`/conversations/${conversationId}/messages/${messageId}/react`, { emoji }).then((res) => res.data);

export const uploadMessageAttachment = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/messages/upload-attachment', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data);
};
