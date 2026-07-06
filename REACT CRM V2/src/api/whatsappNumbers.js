import client from './client';

export const getWhatsappNumbers = () => client.get('/whatsapp-numbers').then((res) => res.data.whatsapp_numbers);

export const createWhatsappNumber = (data) => client.post('/whatsapp-numbers', data).then((res) => res.data);

export const deleteWhatsappNumber = (id) => client.delete(`/whatsapp-numbers/${id}`).then((res) => res.data);

export const getWhatsappNumberStatus = (id) => client.get(`/whatsapp-numbers/${id}/status`).then((res) => res.data);

export const getWhatsappNumberQr = (id) => client.get(`/whatsapp-numbers/${id}/qr`).then((res) => res.data);

export const syncTemplatesForNumber = (id) => client.post(`/whatsapp-numbers/${id}/sync-templates`).then((res) => res.data);
