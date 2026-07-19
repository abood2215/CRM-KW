import client from './client';

export const getDripSequences = () => client.get('/drip-sequences').then((res) => res.data.sequences);

export const getDripSequence = (id) => client.get(`/drip-sequences/${id}`).then((res) => res.data);

export const createDripSequence = (data) => client.post('/drip-sequences', data).then((res) => res.data);

export const updateDripSequence = (id, data) => client.put(`/drip-sequences/${id}`, data).then((res) => res.data);

export const deleteDripSequence = (id) => client.delete(`/drip-sequences/${id}`).then((res) => res.data);

export const replaceDripSequenceSteps = (id, steps) => client.put(`/drip-sequences/${id}/steps`, { steps }).then((res) => res.data);

export const enrollInDripSequence = (id, data) => client.post(`/drip-sequences/${id}/enroll`, data).then((res) => res.data);

export const stopDripEnrollment = (enrollmentId) => client.post(`/drip-enrollments/${enrollmentId}/stop`).then((res) => res.data);
