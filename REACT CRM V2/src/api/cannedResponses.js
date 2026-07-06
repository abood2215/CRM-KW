import client from './client';

export const getCannedResponses = () => client.get('/canned-responses').then((res) => res.data.canned_responses);

export const createCannedResponse = (data) => client.post('/canned-responses', data).then((res) => res.data);

export const updateCannedResponse = (id, data) => client.put(`/canned-responses/${id}`, data).then((res) => res.data);

export const deleteCannedResponse = (id) => client.delete(`/canned-responses/${id}`).then((res) => res.data);
