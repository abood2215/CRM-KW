import client from './client';

export const getConversations = (params) => client.get('/conversations', { params }).then((res) => res.data);

export const getConversation = (id) => client.get(`/conversations/${id}`).then((res) => res.data.conversation);

export const startConversation = (data) => client.post('/conversations', data).then((res) => res.data);

export const getMessages = (conversationId, params) =>
  client.get(`/conversations/${conversationId}/messages`, { params }).then((res) => res.data);

export const sendMessage = (conversationId, data) =>
  client.post(`/conversations/${conversationId}/messages`, data).then((res) => res.data);

export const sendTemplateMessage = (conversationId, data) =>
  client.post(`/conversations/${conversationId}/send-template`, data).then((res) => res.data);

export const addNote = (conversationId, content) =>
  client.post(`/conversations/${conversationId}/notes`, { content }).then((res) => res.data);

export const updateStatus = (conversationId, status) =>
  client.put(`/conversations/${conversationId}/status`, { status }).then((res) => res.data);

export const assignConversation = (conversationId, userId) =>
  client.put(`/conversations/${conversationId}/assign`, { user_id: userId }).then((res) => res.data);

export const sendTyping = (conversationId) =>
  client.post(`/conversations/${conversationId}/typing`).then((res) => res.data);

export const uploadMessageAttachment = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/messages/upload-attachment', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data);
};
